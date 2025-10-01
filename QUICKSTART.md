# PDFSwift - Quick Start Guide

Get your PDF converter running locally in under 10 minutes!

## Prerequisites

Before you start, make sure you have:
- [Node.js](https://nodejs.org/) installed (v14 or higher)
- [PostgreSQL](https://www.postgresql.org/download/) installed
- A code editor (VS Code recommended)
- A terminal/command prompt

## Step 1: Install Dependencies (2 minutes)

Open terminal in the `pdfswift` folder and run:

```bash
npm install
```

This installs all required packages.

## Step 2: Set Up Database (3 minutes)

### Create Database

**Windows (Command Prompt):**
```cmd
psql -U postgres
CREATE DATABASE pdfswift;
\q
```

**Mac/Linux:**
```bash
sudo -u postgres psql
CREATE DATABASE pdfswift;
\q
```

### Load Database Schema

```bash
psql -U postgres -d pdfswift < config/database.sql
```

Or copy/paste the SQL from `config/database.sql` into pgAdmin or any PostgreSQL client.

## Step 3: Configure Environment (2 minutes)

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file with your settings:

   **Minimum required (for testing):**
   ```env
   PORT=3000
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/pdfswift
   JWT_SECRET=your-super-secret-key-change-this
   ```

   **For Stripe testing (optional):**
   - Get test keys from https://dashboard.stripe.com/test/apikeys
   - Add to `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

## Step 4: Start the Server (1 minute)

```bash
npm start
```

You should see:
```
PDFSwift server running on http://localhost:3000
✓ Database connected
```

## Step 5: Test the App (2 minutes)

1. Open browser: http://localhost:3000

2. Test conversion:
   - Click any tool (e.g., "PDF to Image")
   - Upload a PDF file
   - Click "Convert Now"
   - Download result

3. Test signup:
   - Click "Sign Up Free"
   - Create account
   - You'll see "FREE" badge in nav

**That's it! Your app is running!** 🎉

---

## Testing Without Database

Want to skip the database setup for now? You can test the frontend independently:

1. Open `index.html` directly in browser
2. All PDF conversions work (client-side)
3. Signup/login won't work (needs backend)
4. Usage limits won't work (needs backend)

---

## Common Issues

### Issue: "Database connection error"

**Fix:**
1. Make sure PostgreSQL is running
2. Check DATABASE_URL in `.env` matches your setup
3. Test connection:
   ```bash
   psql -U postgres -d pdfswift
   ```

### Issue: "Port 3000 already in use"

**Fix:**
1. Change PORT in `.env` to 3001
2. Restart server

### Issue: "Cannot find module..."

**Fix:**
```bash
rm -rf node_modules
npm install
```

### Issue: PDF conversion fails

**Fix:**
1. Check browser console for errors
2. Make sure file is a valid PDF
3. Try a smaller file first
4. Check file size limits

---

## Testing Stripe Payments (Optional)

### Setup

1. Create Stripe account: https://dashboard.stripe.com/register
2. Get test API keys (starts with `sk_test_` and `pk_test_`)
3. Add to `.env`

### Create Test Products

1. Go to https://dashboard.stripe.com/test/products
2. Create "Pro Plan" product
   - Price: $9.99/month
   - Copy Price ID (starts with `price_`)
3. Create "Business Plan" product
   - Price: $29/month
   - Copy Price ID
4. Add Price IDs to `.env`:
   ```env
   STRIPE_PRICE_PRO_MONTHLY=price_...
   STRIPE_PRICE_BUSINESS_MONTHLY=price_...
   ```

### Test Checkout

1. In app, click "Upgrade to Pro"
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry date
4. Any CVC

**The payment will succeed but no real money is charged!**

---

## Development Mode

For auto-reload on code changes:

```bash
npm run dev
```

This uses nodemon to restart server when you edit files.

---

## Testing Different User Scenarios

### 1. Free User (Anonymous)
- Open app in incognito/private window
- Convert 3 files
- On 4th conversion, see upgrade prompt

### 2. Free User (Registered)
- Sign up for account
- Same limits as anonymous
- Can track usage in dashboard

### 3. Pro User (Test)
To test Pro features without paying:
1. Connect to database:
   ```bash
   psql -U postgres -d pdfswift
   ```
2. Upgrade your user manually:
   ```sql
   UPDATE users SET subscription_tier = 'pro' WHERE email = 'your@email.com';
   ```
3. Refresh app - you'll see "PRO" badge
4. Unlimited conversions available

---

## File Structure Reference

```
pdfswift/
├── index.html          ← Landing page
├── server.js           ← Backend server
├── package.json        ← Dependencies
├── .env                ← Your config (create from .env.example)
│
├── css/
│   └── styles.css      ← All styles
│
├── js/
│   ├── app.js          ← Main app logic
│   ├── auth.js         ← Login/signup
│   └── converters.js   ← PDF conversion functions
│
├── routes/
│   ├── auth.js         ← Backend: authentication
│   ├── conversions.js  ← Backend: usage tracking
│   └── payments.js     ← Backend: Stripe integration
│
└── config/
    ├── database.js     ← DB connection
    └── database.sql    ← DB schema
```

---

## Making Your First Change

Let's customize the app name:

1. **Change Brand Name:**
   - Edit `index.html` line 5: `<title>YourName - PDF Tools</title>`
   - Edit `index.html` line 24: `<span>YourName</span>`

2. **Change Primary Color:**
   - Edit `css/styles.css` line 2:
     ```css
     --primary-color: #your-color;
     ```

3. **Restart server** (if running)

4. **Refresh browser** to see changes

---

## Next Steps

### To Continue Developing:
1. Read `README.md` for full features
2. Check `DEPLOYMENT.md` for hosting
3. Review `MARKETING.md` for growth

### To Deploy:
1. Push code to GitHub
2. Follow Railway deployment (easiest)
3. Set up Stripe products
4. Configure domain

### To Make Money:
1. Launch on ProductHunt
2. Write SEO content
3. Get first paying customer!

---

## Need Help?

**Quick Checks:**
1. Is PostgreSQL running?
2. Is `.env` configured?
3. Did you run `npm install`?
4. Any errors in terminal?

**Common Commands:**
```bash
# Check if server is running
curl http://localhost:3000

# Check database connection
psql -U postgres -d pdfswift -c "SELECT COUNT(*) FROM users;"

# View server logs
# (logs appear in terminal where you ran npm start)

# Restart server
# Press Ctrl+C, then npm start again
```

---

## Production Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to random string
- [ ] Use production Stripe keys
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Set strong database password
- [ ] Test all features
- [ ] Set up backups

---

**You're all set!** Start converting PDFs and building your passive income app! 🚀

Questions? Check the other docs or dive into the code!
