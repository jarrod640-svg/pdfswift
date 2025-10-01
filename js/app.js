// PDFSwift - Main Application Logic

let currentTool = null;
let uploadedFiles = [];

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Tool card click handlers
    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach(card => {
        card.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            const tool = card.dataset.tool;
            openConverter(tool);
        });
    });

    // Modal close handlers
    document.getElementById('closeModal').addEventListener('click', closeConverter);
    document.getElementById('closeAuthModal').addEventListener('click', closeAuthModal);

    // Click outside modal to close
    document.getElementById('converterModal').addEventListener('click', (e) => {
        if (e.target.id === 'converterModal') closeConverter();
    });
    document.getElementById('authModal').addEventListener('click', (e) => {
        if (e.target.id === 'authModal') closeAuthModal();
    });

    // Auth form handlers
    setupAuthForms();

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });

    // Pricing buttons
    document.getElementById('proPlanBtn').addEventListener('click', () => upgradeToPlan('pro'));
    document.getElementById('businessPlanBtn').addEventListener('click', () => upgradeToPlan('business'));

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
}

async function openConverter(toolType) {
    currentTool = toolType;
    uploadedFiles = [];

    // Check if premium feature
    if (!auth.canAccessPremiumFeature(toolType)) {
        showUpgradeModal(toolType);
        return;
    }

    const toolTitles = {
        'pdf-to-image': 'PDF to Image',
        'image-to-pdf': 'Image to PDF',
        'merge-pdf': 'Merge PDFs',
        'split-pdf': 'Split PDF',
        'compress-pdf': 'Compress PDF',
        'pdf-to-word': 'PDF to Word',
        'pdf-to-excel': 'PDF to Excel',
        'pdf-to-ppt': 'PDF to PowerPoint'
    };

    const modal = document.getElementById('converterModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = toolTitles[toolType] || 'PDF Converter';
    modalBody.innerHTML = createUploadUI(toolType);

    // Update usage tracker
    await updateUsageTracker();

    // Setup file upload handlers
    setupFileUpload(toolType);

    modal.classList.add('active');
}

function closeConverter() {
    document.getElementById('converterModal').classList.remove('active');
    uploadedFiles = [];
    currentTool = null;
}

function setupFileUpload(toolType) {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const filesList = document.getElementById('filesList');
    const convertButton = document.getElementById('convertButton');

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files, toolType);
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files, toolType);
    });
}

function handleFiles(files, toolType) {
    const maxSize = auth.getMaxFileSize();
    const fileArray = Array.from(files);

    // Validate file sizes
    for (const file of fileArray) {
        if (file.size > maxSize) {
            alert(`File "${file.name}" exceeds maximum size of ${converter.formatFileSize(maxSize)}`);
            return;
        }
    }

    // Validate file types
    const validTypes = {
        'pdf-to-image': ['application/pdf'],
        'image-to-pdf': ['image/jpeg', 'image/png', 'image/jpg'],
        'merge-pdf': ['application/pdf'],
        'split-pdf': ['application/pdf'],
        'compress-pdf': ['application/pdf'],
        'pdf-to-word': ['application/pdf'],
        'pdf-to-excel': ['application/pdf'],
        'pdf-to-ppt': ['application/pdf']
    };

    for (const file of fileArray) {
        if (!validTypes[toolType].includes(file.type)) {
            alert(`Invalid file type: ${file.name}`);
            return;
        }
    }

    uploadedFiles = fileArray;
    displayFilesList();
    showConvertButton();
}

function displayFilesList() {
    const filesList = document.getElementById('filesList');
    if (uploadedFiles.length === 0) {
        filesList.innerHTML = '';
        return;
    }

    const filesHTML = uploadedFiles.map((file, index) => `
        <div class="result-file">
            <div>
                <strong>${file.name}</strong><br>
                <small>${converter.formatFileSize(file.size)}</small>
            </div>
            <button class="btn-secondary" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    filesList.innerHTML = filesHTML;
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    displayFilesList();
    if (uploadedFiles.length === 0) {
        document.getElementById('convertButton').innerHTML = '';
    }
}

function showConvertButton() {
    const convertButton = document.getElementById('convertButton');
    convertButton.innerHTML = `
        <button class="btn-primary btn-large" onclick="startConversion()">
            <i class="fas fa-sync-alt"></i> Convert Now
        </button>
    `;
}

async function startConversion() {
    // Check usage limits
    const usage = await auth.getUsageStats();
    if (auth.getUserTier() === 'free' && usage.remaining <= 0) {
        showUpgradeModal(currentTool);
        return;
    }

    // Show processing UI
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = createProcessingUI();

    try {
        let results = [];

        switch (currentTool) {
            case 'pdf-to-image':
                results = await converter.pdfToImage(uploadedFiles[0], 'png');
                break;
            case 'image-to-pdf':
                results = await converter.imageToPdf(uploadedFiles);
                break;
            case 'merge-pdf':
                results = await converter.mergePdfs(uploadedFiles);
                break;
            case 'split-pdf':
                results = await converter.splitPdf(uploadedFiles[0]);
                break;
            case 'compress-pdf':
                results = await converter.compressPdf(uploadedFiles[0]);
                break;
            default:
                throw new Error('Conversion type not yet implemented');
        }

        // Track conversion
        const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
        await auth.trackConversion(currentTool, totalSize / (1024 * 1024)); // Size in MB

        // Store results for download
        converter.uploadedFiles = results;

        // Show results
        modalBody.innerHTML = createResultUI(results, currentTool);

        // Update usage tracker
        await updateUsageTracker();

    } catch (error) {
        console.error('Conversion error:', error);
        modalBody.innerHTML = `
            <div class="conversion-result">
                <div class="result-icon" style="color: var(--danger-color);">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <h3>Conversion Failed</h3>
                <p>Sorry, something went wrong. Please try again.</p>
                <button class="btn-primary" onclick="location.reload()">
                    Try Again
                </button>
            </div>
        `;
    }
}

async function updateUsageTracker() {
    const usageTracker = document.getElementById('usageTracker');
    if (!usageTracker) return;

    const tier = auth.getUserTier();
    if (tier !== 'free') {
        usageTracker.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-infinity" style="color: var(--success-color); font-size: 1.5rem;"></i>
                <p style="margin: 0.5rem 0 0 0; color: var(--success-color); font-weight: 600;">
                    Unlimited Conversions
                </p>
            </div>
        `;
        return;
    }

    const usage = await auth.getUsageStats();
    const percentage = (usage.count / usage.limit) * 100;

    usageTracker.innerHTML = `
        <div>
            <p style="margin-bottom: 0.5rem; text-align: center;">
                <strong>${usage.remaining} of ${usage.limit}</strong> free conversions remaining today
            </p>
            <div class="usage-bar">
                <div class="usage-fill" style="width: ${percentage}%"></div>
            </div>
        </div>
    `;
}

function showUpgradeModal(toolType) {
    const modal = document.getElementById('converterModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = 'Upgrade Required';
    modalBody.innerHTML = `
        <div class="upgrade-prompt">
            <div style="font-size: 3rem; margin-bottom: 1rem;">
                <i class="fas fa-lock"></i>
            </div>
            <h3>This is a Premium Feature</h3>
            <p style="margin: 1rem 0;">Upgrade to Pro to unlock all conversion tools and unlimited conversions</p>

            <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; margin: 1.5rem 0;">
                <h4 style="margin-bottom: 0.5rem;">Pro Plan Benefits:</h4>
                <ul style="text-align: left; display: inline-block;">
                    <li>✓ Unlimited conversions</li>
                    <li>✓ All conversion types (PDF↔Word, Excel, PPT)</li>
                    <li>✓ No watermarks</li>
                    <li>✓ 100MB file size limit</li>
                    <li>✓ Priority processing</li>
                </ul>
            </div>

            <button class="btn-large" style="background: white; color: var(--primary-color); margin-top: 1rem;"
                    onclick="showPricing()">
                Upgrade to Pro - $9.99/month
            </button>
        </div>
    `;

    modal.classList.add('active');
}

function showPricing() {
    closeConverter();
    closeAuthModal();
    document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' });
}

async function upgradeToPlan(plan) {
    if (!auth.user) {
        showAuthModal('signup');
        return;
    }

    // Map plan to Stripe Price IDs (LIVE)
    const priceIds = {
        'pro': 'price_1SDI7GIgy3bHAOtxzy2ojZ8v', // Pro Monthly
        'pro-yearly': 'price_1SDI90Igy3bHAOtxoKM9KR3w', // Pro Yearly
        'business': 'price_1SDI9PIgy3bHAOtxPZ3hicC4', // Business Monthly
        'business-yearly': 'price_1SDI9mIgy3bHAOtxjXDIplMl' // Business Yearly
    };

    const priceId = priceIds[plan];
    if (!priceId) {
        alert('Invalid plan selected');
        return;
    }

    try {
        // Call backend to create Stripe checkout session
        const response = await fetch(`${auth.apiUrl}/payments/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.token}`
            },
            body: JSON.stringify({ priceId, plan })
        });

        const data = await response.json();

        if (response.ok && data.url) {
            // Redirect to Stripe checkout
            window.location.href = data.url;
        } else {
            alert('Failed to create checkout session. Please try again.');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('An error occurred. Please try again.');
    }
}

// Auth Modal Functions
function showAuthModal(mode = 'login') {
    const modal = document.getElementById('authModal');
    const modalTitle = document.getElementById('authModalTitle');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (mode === 'login') {
        modalTitle.textContent = 'Login';
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        modalTitle.textContent = 'Sign Up';
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    }

    modal.classList.add('active');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

function setupAuthForms() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const result = await auth.login(email, password);

        if (result.success) {
            closeAuthModal();
            showAlert('Welcome back!', 'success');
        } else {
            showAlert(result.error, 'error');
        }
    });

    // Signup form
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        const result = await auth.signup(name, email, password);

        if (result.success) {
            closeAuthModal();
            showAlert('Account created successfully!', 'success');
        } else {
            showAlert(result.error, 'error');
        }
    });

    // Form switchers
    document.getElementById('showSignup').addEventListener('click', (e) => {
        e.preventDefault();
        showAuthModal('signup');
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showAuthModal('login');
    });
}

function showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 3000;
        min-width: 300px;
        animation: slideIn 0.3s;
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Footer Link Functions
function showPrivacyPolicy() {
    const modal = document.getElementById('converterModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = 'Privacy Policy';
    modalBody.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; text-align: left;">
            <h3>Privacy Policy for PDFSwift Pro</h3>
            <p><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>

            <h4>1. Information We Collect</h4>
            <p>We collect minimal personal information:</p>
            <ul>
                <li><strong>Account Information:</strong> Email address, name, and password (encrypted)</li>
                <li><strong>Payment Information:</strong> Processed securely through Stripe (we never store card details)</li>
                <li><strong>Usage Data:</strong> Conversion count, timestamps (to enforce free tier limits)</li>
            </ul>

            <h4>2. How We Use Your Information</h4>
            <ul>
                <li>Provide PDF conversion services</li>
                <li>Process payments and manage subscriptions</li>
                <li>Enforce usage limits for free tier</li>
                <li>Send account-related notifications</li>
            </ul>

            <h4>3. Privacy-First File Processing</h4>
            <p><strong>Your files are NOT uploaded to our servers.</strong> Basic conversions (PDF↔Image, Merge, Split, Compress) are processed entirely in your browser using JavaScript. Your files never leave your device.</p>

            <h4>4. Data Security</h4>
            <ul>
                <li>Passwords are hashed using bcrypt</li>
                <li>HTTPS encryption for all communications</li>
                <li>Payment processing via Stripe (PCI compliant)</li>
            </ul>

            <h4>5. Third-Party Services</h4>
            <ul>
                <li><strong>Stripe:</strong> Payment processing (see Stripe's privacy policy)</li>
                <li><strong>Railway:</strong> Hosting infrastructure</li>
            </ul>

            <h4>6. Your Rights</h4>
            <p>You can:</p>
            <ul>
                <li>Access your account data</li>
                <li>Delete your account (contact support@pdfswiftpro.com)</li>
                <li>Export your data</li>
                <li>Opt out of marketing emails</li>
            </ul>

            <h4>7. Contact Us</h4>
            <p>For privacy concerns: <a href="mailto:admin@pdfswiftpro.com">admin@pdfswiftpro.com</a></p>
        </div>
    `;

    modal.classList.add('active');
}

function showTermsOfService() {
    const modal = document.getElementById('converterModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = 'Terms of Service';
    modalBody.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; text-align: left;">
            <h3>Terms of Service for PDFSwift Pro</h3>
            <p><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>

            <h4>1. Acceptance of Terms</h4>
            <p>By using PDFSwift Pro, you agree to these Terms of Service. If you disagree, please do not use our service.</p>

            <h4>2. Service Description</h4>
            <p>PDFSwift Pro provides online PDF conversion tools including:</p>
            <ul>
                <li>Free tier: 3 conversions per day with basic tools</li>
                <li>Pro tier ($9.99/month): Unlimited conversions and advanced features</li>
                <li>Business tier ($29/month): Everything in Pro plus team features</li>
            </ul>

            <h4>3. User Responsibilities</h4>
            <p>You agree to:</p>
            <ul>
                <li>Provide accurate account information</li>
                <li>Keep your password secure</li>
                <li>Not abuse or exploit the service</li>
                <li>Not use for illegal purposes</li>
                <li>Not upload malicious files</li>
            </ul>

            <h4>4. Subscription Terms</h4>
            <ul>
                <li><strong>Billing:</strong> Subscriptions renew automatically monthly or yearly</li>
                <li><strong>Cancellation:</strong> Cancel anytime; access continues until period end</li>
                <li><strong>Refunds:</strong> No refunds for partial months</li>
                <li><strong>Price Changes:</strong> We'll notify you 30 days before any price increases</li>
            </ul>

            <h4>5. Acceptable Use</h4>
            <p>You may NOT:</p>
            <ul>
                <li>Resell or redistribute our service</li>
                <li>Reverse engineer our software</li>
                <li>Attempt to bypass usage limits</li>
                <li>Use automated tools to abuse the service</li>
            </ul>

            <h4>6. Service Availability</h4>
            <p>We strive for 99.9% uptime but do not guarantee uninterrupted service. We're not liable for downtime.</p>

            <h4>7. Intellectual Property</h4>
            <p>PDFSwift Pro's code, design, and branding are our property. Your uploaded files remain your property.</p>

            <h4>8. Limitation of Liability</h4>
            <p>We're not responsible for:</p>
            <ul>
                <li>Data loss or corruption</li>
                <li>Conversion errors or inaccuracies</li>
                <li>Indirect or consequential damages</li>
            </ul>

            <h4>9. Termination</h4>
            <p>We may suspend or terminate accounts that violate these terms.</p>

            <h4>10. Changes to Terms</h4>
            <p>We may update these terms. Continued use after changes means acceptance.</p>

            <h4>11. Contact</h4>
            <p>Questions? Email: <a href="mailto:admin@pdfswiftpro.com">admin@pdfswiftpro.com</a></p>
        </div>
    `;

    modal.classList.add('active');
}

function showHelpCenter() {
    const modal = document.getElementById('converterModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = 'Help Center';
    modalBody.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <h3>Frequently Asked Questions</h3>

            <div style="margin: 2rem 0;">
                <h4>🔒 Is my data secure?</h4>
                <p>Yes! Basic conversions are processed entirely in your browser - your files never leave your device. We never store your PDF files on our servers.</p>
            </div>

            <div style="margin: 2rem 0;">
                <h4>💳 How does billing work?</h4>
                <p>Pro subscriptions ($9.99/month) are billed automatically via Stripe. You can cancel anytime and keep access until your billing period ends.</p>
            </div>

            <div style="margin: 2rem 0;">
                <h4>📊 What's included in the free tier?</h4>
                <p>Free users get 3 conversions per day with basic tools (PDF↔Image, Merge, Split, Compress). Pro users get unlimited conversions and advanced features.</p>
            </div>

            <div style="margin: 2rem 0;">
                <h4>🔄 Can I convert large files?</h4>
                <p>Free tier: 10MB limit<br>Pro tier: 100MB limit<br>Business tier: 500MB limit</p>
            </div>

            <div style="margin: 2rem 0;">
                <h4>❌ How do I cancel my subscription?</h4>
                <p>Email us at <a href="mailto:support@pdfswiftpro.com">support@pdfswiftpro.com</a> or manage your subscription in your account dashboard.</p>
            </div>

            <div style="margin: 2rem 0;">
                <h4>📧 Still need help?</h4>
                <p>Contact our support team:</p>
                <p><a href="mailto:support@pdfswiftpro.com" class="btn-primary" style="display: inline-block; margin-top: 0.5rem;">
                    <i class="fas fa-envelope"></i> Email Support
                </a></p>
                <p style="margin-top: 1rem; color: var(--text-light);">
                    We typically respond within 24 hours
                </p>
            </div>

            <div style="background: var(--bg-light); padding: 1.5rem; border-radius: 8px; margin-top: 2rem;">
                <h4>💬 AI Chat Support (Coming Soon)</h4>
                <p>We're working on adding AI-powered chat support for instant answers!</p>
            </div>
        </div>
    `;

    modal.classList.add('active');
}
