// Payment & Stripe Integration Routes
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Create checkout session for subscription
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
    try {
        const { priceId, plan } = req.body;
        const userId = req.user.userId;

        // Get user
        const userResult = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Create or get Stripe customer
        let customerId = user.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: userId.toString()
                }
            });
            customerId = customer.id;

            // Update user with customer ID
            await pool.query(
                'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
                [customerId, userId]
            );
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.APP_URL || 'http://localhost:3000'}?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}?canceled=true`,
            metadata: {
                userId: userId.toString(),
                plan: plan
            }
        });

        res.json({ sessionId: session.id, url: session.url });

    } catch (error) {
        console.error('Checkout session error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Stripe webhook handler
const webhookHandler = async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const userId = parseInt(session.metadata.userId);
            const plan = session.metadata.plan;

            // Update user subscription
            await pool.query(
                `UPDATE users
                 SET subscription_tier = $1,
                     subscription_status = 'active',
                     stripe_subscription_id = $2
                 WHERE id = $3`,
                [plan, session.subscription, userId]
            );

            // Log payment
            await pool.query(
                `INSERT INTO payments (user_id, stripe_payment_id, amount, status, description)
                 VALUES ($1, $2, $3, 'succeeded', $4)`,
                [userId, session.payment_intent, session.amount_total / 100, `${plan} subscription`]
            );

            console.log(`Subscription activated for user ${userId}: ${plan}`);
            break;
        }

        case 'customer.subscription.updated': {
            const subscription = event.data.object;
            const customerId = subscription.customer;

            // Find user by customer ID
            const userResult = await pool.query(
                'SELECT id FROM users WHERE stripe_customer_id = $1',
                [customerId]
            );

            if (userResult.rows.length > 0) {
                const userId = userResult.rows[0].id;

                // Update subscription status
                const status = subscription.status === 'active' ? 'active' :
                               subscription.status === 'past_due' ? 'past_due' :
                               subscription.status === 'canceled' ? 'cancelled' : 'active';

                await pool.query(
                    'UPDATE users SET subscription_status = $1 WHERE id = $2',
                    [status, userId]
                );
            }
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            const customerId = subscription.customer;

            // Find user and downgrade to free
            const userResult = await pool.query(
                'SELECT id FROM users WHERE stripe_customer_id = $1',
                [customerId]
            );

            if (userResult.rows.length > 0) {
                const userId = userResult.rows[0].id;

                await pool.query(
                    `UPDATE users
                     SET subscription_tier = 'free',
                         subscription_status = 'cancelled',
                         stripe_subscription_id = NULL
                     WHERE id = $1`,
                    [userId]
                );

                console.log(`Subscription cancelled for user ${userId}`);
            }
            break;
        }

        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            const customerId = invoice.customer;

            // Find user and update status
            await pool.query(
                `UPDATE users
                 SET subscription_status = 'past_due'
                 WHERE stripe_customer_id = $1`,
                [customerId]
            );
            break;
        }

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
};

// Register webhook handler on router
router.post('/webhook', webhookHandler);

// Get subscription status
router.get('/subscription-status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `SELECT subscription_tier, subscription_status, stripe_subscription_id
             FROM users WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // If user has active subscription, get details from Stripe
        if (user.stripe_subscription_id) {
            const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

            res.json({
                tier: user.subscription_tier,
                status: user.subscription_status,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end
            });
        } else {
            res.json({
                tier: user.subscription_tier,
                status: user.subscription_status
            });
        }

    } catch (error) {
        console.error('Subscription status error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            'SELECT stripe_subscription_id FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const subscriptionId = result.rows[0].stripe_subscription_id;

        if (!subscriptionId) {
            return res.status(400).json({ error: 'No active subscription' });
        }

        // Cancel subscription at period end
        await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
        });

        res.json({ success: true, message: 'Subscription will cancel at period end' });

    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
module.exports.webhook = webhookHandler;
