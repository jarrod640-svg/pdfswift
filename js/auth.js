// PDFSwift - Authentication & User Management

class AuthManager {
    constructor() {
        this.apiUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3000/api'
            : '/api';
        this.user = null;
        this.token = localStorage.getItem('pdfswift_token');
        this.sessionId = this.getOrCreateSessionId();

        if (this.token) {
            this.validateToken();
        }

        this.updateUI();
    }

    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('pdfswift_session');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('pdfswift_session', sessionId);
        }
        return sessionId;
    }

    async validateToken() {
        try {
            const response = await fetch(`${this.apiUrl}/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.user = data.user;
                this.updateUI();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Token validation failed:', error);
        }
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('pdfswift_token', this.token);
                this.updateUI();
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    async signup(name, email, password) {
        try {
            const response = await fetch(`${this.apiUrl}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('pdfswift_token', this.token);
                this.updateUI();
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Signup failed' };
            }
        } catch (error) {
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('pdfswift_token');
        this.updateUI();
        window.location.href = '/';
    }

    async trackConversion(conversionType, fileSize) {
        try {
            const response = await fetch(`${this.apiUrl}/conversions/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                },
                body: JSON.stringify({
                    conversionType,
                    fileSize,
                    sessionId: this.sessionId
                })
            });

            return await response.json();
        } catch (error) {
            console.error('Failed to track conversion:', error);
            return { allowed: true }; // Allow conversion even if tracking fails
        }
    }

    async getUsageStats() {
        try {
            const response = await fetch(`${this.apiUrl}/conversions/usage`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                },
                body: JSON.stringify({ sessionId: this.sessionId }),
                method: 'POST'
            });

            return await response.json();
        } catch (error) {
            console.error('Failed to get usage stats:', error);
            return { count: 0, limit: 3, remaining: 3 };
        }
    }

    getUserTier() {
        if (!this.user) return 'free';
        return this.user.subscription_tier || 'free';
    }

    canAccessPremiumFeature(feature) {
        const tier = this.getUserTier();
        const premiumFeatures = ['pdf-to-word', 'pdf-to-excel', 'pdf-to-ppt'];

        if (premiumFeatures.includes(feature)) {
            return tier === 'pro' || tier === 'business';
        }

        return true;
    }

    getMaxFileSize() {
        const tier = this.getUserTier();
        const sizes = {
            'free': 10 * 1024 * 1024, // 10MB
            'pro': 100 * 1024 * 1024, // 100MB
            'business': 500 * 1024 * 1024 // 500MB
        };
        return sizes[tier] || sizes.free;
    }

    updateUI() {
        const loginBtns = document.querySelectorAll('#loginBtn, #loginBtnMobile');
        const signupBtns = document.querySelectorAll('#signupBtn, #signupBtnMobile');

        if (this.user) {
            // User is logged in
            loginBtns.forEach(btn => {
                btn.textContent = this.user.name || this.user.email;
                btn.onclick = (e) => {
                    e.preventDefault();
                    this.showAccountMenu();
                };
            });

            signupBtns.forEach(btn => {
                const tierBadge = this.getUserTier().toUpperCase();
                btn.textContent = tierBadge;
                btn.onclick = (e) => {
                    e.preventDefault();
                    if (this.getUserTier() === 'free') {
                        showPricing();
                    } else {
                        this.showAccountMenu();
                    }
                };
            });
        } else {
            // User is not logged in
            loginBtns.forEach(btn => {
                btn.textContent = 'Login';
                btn.onclick = (e) => {
                    e.preventDefault();
                    showAuthModal('login');
                };
            });

            signupBtns.forEach(btn => {
                btn.textContent = 'Sign Up Free';
                btn.onclick = (e) => {
                    e.preventDefault();
                    showAuthModal('signup');
                };
            });
        }

        // Update max file size display
        const maxFileSizeEl = document.getElementById('maxFileSize');
        if (maxFileSizeEl) {
            maxFileSizeEl.textContent = converter.formatFileSize(this.getMaxFileSize());
        }
    }

    showAccountMenu() {
        const menu = document.createElement('div');
        menu.className = 'account-menu';
        menu.style.cssText = `
            position: absolute;
            top: 60px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            padding: 1rem;
            z-index: 3000;
            min-width: 200px;
        `;

        menu.innerHTML = `
            <div style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 0.5rem;">
                <strong>${this.user.name || 'Account'}</strong><br>
                <small style="color: var(--text-light);">${this.user.email}</small><br>
                <small style="color: var(--primary-color);">
                    <strong>${this.getUserTier().toUpperCase()}</strong>
                </small>
            </div>
            <a href="#" onclick="auth.showDashboard(); return false;" style="display: block; padding: 0.5rem; text-decoration: none; color: var(--text-dark);">
                <i class="fas fa-tachometer-alt"></i> Dashboard
            </a>
            ${this.getUserTier() === 'free' ? `
                <a href="#" onclick="showPricing(); return false;" style="display: block; padding: 0.5rem; text-decoration: none; color: var(--primary-color);">
                    <i class="fas fa-star"></i> Upgrade to Pro
                </a>
            ` : ''}
            <a href="#" onclick="auth.logout(); return false;" style="display: block; padding: 0.5rem; text-decoration: none; color: var(--danger-color);">
                <i class="fas fa-sign-out-alt"></i> Logout
            </a>
        `;

        // Remove existing menu if any
        const existing = document.querySelector('.account-menu');
        if (existing) existing.remove();

        document.body.appendChild(menu);

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    async cancelSubscription() {
        if (!confirm('Are you sure you want to cancel your subscription? You will keep access until the end of your billing period.')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/payments/cancel-subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                alert('Subscription cancelled successfully. You will keep access until ' + new Date(data.cancelAt * 1000).toLocaleDateString());
                await this.validateToken(); // Refresh user data
                this.showDashboard(); // Refresh dashboard
            } else {
                alert(data.error || 'Failed to cancel subscription');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            alert('An error occurred. Please try again.');
        }
    }

    async showDashboard() {
        const usage = await this.getUsageStats();
        const tierInfo = {
            'free': { name: 'Free', limit: '3/day', price: '$0' },
            'pro': { name: 'Pro', limit: 'Unlimited', price: '$9.99/mo' },
            'business': { name: 'Business', limit: 'Unlimited', price: '$29/mo' }
        };

        const tier = this.getUserTier();
        const info = tierInfo[tier];

        const modal = document.getElementById('converterModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = 'My Account';
        modalBody.innerHTML = `
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; text-align: center;">
                    <h2>${info.name} Plan</h2>
                    <p style="font-size: 2rem; margin: 1rem 0;">${info.price}</p>
                    <p>${info.limit} conversions</p>
                </div>

                <div style="background: var(--bg-light); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3>Usage This Month</h3>
                    <p style="font-size: 2rem; color: var(--primary-color);">
                        ${usage.monthlyCount || 0} conversions
                    </p>
                </div>

                <div style="background: var(--bg-light); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3>Account Details</h3>
                    <p><strong>Email:</strong> ${this.user.email}</p>
                    <p><strong>Member since:</strong> ${new Date(this.user.created_at).toLocaleDateString()}</p>
                </div>

                ${tier === 'free' ? `
                    <div style="text-align: center; margin-top: 2rem;">
                        <button class="btn-primary btn-large" onclick="showPricing()">
                            <i class="fas fa-star"></i> Upgrade to Pro
                        </button>
                    </div>
                ` : `
                    <div style="text-align: center; margin-top: 2rem;">
                        <button class="btn-secondary" onclick="auth.cancelSubscription(); return false;">
                            <i class="fas fa-times-circle"></i> Cancel Subscription
                        </button>
                    </div>
                `}
            </div>
        `;

        modal.classList.add('active');
    }
}

// Create global auth instance
const auth = new AuthManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, auth };
}
