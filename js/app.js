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

    // Map plan to Stripe Price IDs
    const priceIds = {
        'pro': 'price_1SDHGjRPptJDPovShREfqHaJ', // Pro Monthly
        'pro-yearly': 'price_1SDHIZRPptJDPovSVnXSJygU', // Pro Yearly
        'business': 'price_1SDHKFRPptJDPovS8JiG3Ioe', // Business Monthly
        'business-yearly': 'price_1SDHLDRPptJDPovSEtX5kZ3L' // Business Yearly
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
