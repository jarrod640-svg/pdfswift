// Conversion Tracking Routes
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

// Track conversion
router.post('/track', optionalAuth, async (req, res) => {
    try {
        const { conversionType, fileSize, sessionId } = req.body;
        const userId = req.user ? req.user.userId : null;

        // Get user's subscription tier
        let tier = 'free';
        if (userId) {
            const userResult = await pool.query(
                'SELECT subscription_tier FROM users WHERE id = $1',
                [userId]
            );
            if (userResult.rows.length > 0) {
                tier = userResult.rows[0].subscription_tier;
            }
        }

        // Check daily usage for free tier
        if (tier === 'free') {
            const today = new Date().toISOString().split('T')[0];

            // Get or create daily usage record
            const usageResult = await pool.query(
                `INSERT INTO daily_usage (user_id, session_id, usage_date, conversion_count)
                 VALUES ($1, $2, $3, 0)
                 ON CONFLICT (${userId ? 'user_id' : 'session_id'}, usage_date)
                 DO UPDATE SET conversion_count = daily_usage.conversion_count
                 RETURNING conversion_count`,
                [userId, sessionId, today]
            );

            const currentCount = usageResult.rows[0].conversion_count;

            // Free tier limit: 3 conversions per day
            if (currentCount >= 3) {
                return res.status(429).json({
                    allowed: false,
                    error: 'Daily conversion limit reached',
                    limit: 3,
                    count: currentCount
                });
            }

            // Increment usage
            await pool.query(
                `UPDATE daily_usage
                 SET conversion_count = conversion_count + 1
                 WHERE ${userId ? 'user_id = $1' : 'session_id = $1'} AND usage_date = $2`,
                [userId || sessionId, today]
            );
        }

        // Log conversion
        await pool.query(
            `INSERT INTO conversions (user_id, session_id, conversion_type, file_size_mb, ip_address)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, sessionId, conversionType, fileSize, req.ip]
        );

        res.json({
            allowed: true,
            success: true
        });

    } catch (error) {
        console.error('Tracking error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get usage statistics
router.post('/usage', optionalAuth, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const userId = req.user ? req.user.userId : null;

        // Get user's subscription tier
        let tier = 'free';
        if (userId) {
            const userResult = await pool.query(
                'SELECT subscription_tier FROM users WHERE id = $1',
                [userId]
            );
            if (userResult.rows.length > 0) {
                tier = userResult.rows[0].subscription_tier;
            }
        }

        // If not free tier, return unlimited
        if (tier !== 'free') {
            // Get monthly count for display
            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);

            const monthlyResult = await pool.query(
                `SELECT COUNT(*) as count FROM conversions
                 WHERE ${userId ? 'user_id = $1' : 'session_id = $1'}
                 AND created_at >= $2`,
                [userId || sessionId, monthStart]
            );

            return res.json({
                tier: tier,
                limit: 'unlimited',
                count: 'unlimited',
                remaining: 'unlimited',
                monthlyCount: parseInt(monthlyResult.rows[0].count)
            });
        }

        // For free tier, get today's usage
        const today = new Date().toISOString().split('T')[0];

        const result = await pool.query(
            `SELECT conversion_count FROM daily_usage
             WHERE ${userId ? 'user_id = $1' : 'session_id = $1'} AND usage_date = $2`,
            [userId || sessionId, today]
        );

        const count = result.rows.length > 0 ? result.rows[0].conversion_count : 0;
        const limit = 3;

        res.json({
            tier: 'free',
            limit: limit,
            count: count,
            remaining: Math.max(0, limit - count)
        });

    } catch (error) {
        console.error('Usage stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
