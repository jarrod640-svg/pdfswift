# PDFSwift - Professional PDF Converter SaaS

A complete, production-ready PDF conversion web application with monetization features built for passive income.

## Features

### Core Functionality
- **PDF to Image** - Convert PDF pages to PNG/JPG
- **Image to PDF** - Combine images into a single PDF
- **Merge PDF** - Combine multiple PDFs
- **Split PDF** - Extract individual pages
- **Compress PDF** - Reduce file size
- **Premium Features** (Pro/Business):
  - PDF to Word (DOCX)
  - PDF to Excel (XLSX)
  - PDF to PowerPoint (PPTX)

### Monetization Features
- Free tier (3 conversions/day)
- Pro subscription ($9.99/month)
- Business subscription ($29/month)
- Stripe integration for payments
- Usage tracking and rate limiting
- User authentication

### Technical Features
- Client-side PDF processing (privacy-focused)
- Responsive design (mobile-optimized)
- Drag-and-drop file upload
- User dashboard
- Session tracking for anonymous users
- PostgreSQL database
- JWT authentication

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- Stripe account (for payments)

### Installation

1. **Clone/Download the project**
   ```bash
   cd pdfswift
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - Database URL
   - JWT secret
   - Stripe keys
   - SMTP settings (optional)

4. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb pdfswift

   # Run the schema
   psql pdfswift < config/database.sql
   ```

5. **Configure Stripe**
   - Go to https://dashboard.stripe.com
   - Get your API keys (Settings → API keys)
   - Create products and prices for Pro and Business plans
   - Set up webhook endpoint: `https://yourdomain.com/api/payments/webhook`
   - Add webhook secret to `.env`

6. **Start the server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

7. **Access the application**
   Open http://localhost:3000 in your browser

## Deployment

### Recommended Hosting
- **Frontend + Backend**: Railway, Render, or DigitalOcean App Platform
- **Database**: Railway PostgreSQL, Heroku Postgres, or managed PostgreSQL
- **Alternative**: Vercel (frontend) + Railway (backend + DB)

### Railway Deployment (Easiest)

1. Push code to GitHub
2. Connect Railway to your repo
3. Add PostgreSQL service
4. Set environment variables
5. Deploy!

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=your-production-database-url
JWT_SECRET=generate-random-secret-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=https://yourdomain.com
```

## File Structure

```
pdfswift/
├── index.html              # Main landing page
├── server.js               # Express server
├── package.json            # Dependencies
├── .env.example            # Environment template
├── config/
│   ├── database.js         # Database connection
│   └── database.sql        # Database schema
├── routes/
│   ├── auth.js             # Authentication endpoints
│   ├── conversions.js      # Conversion tracking
│   └── payments.js         # Stripe integration
├── middleware/
│   └── auth.js             # JWT middleware
├── css/
│   └── styles.css          # Main stylesheet
└── js/
    ├── app.js              # Main app logic
    ├── auth.js             # Authentication client
    └── converters.js       # PDF conversion functions
```

## Revenue Model

### Pricing Tiers

**Free** - $0/month
- 3 conversions per day
- 10MB file limit
- Basic tools only
- Watermark on output

**Pro** - $9.99/month (or $79/year)
- Unlimited conversions
- 100MB file limit
- All conversion types
- No watermarks
- Priority processing

**Business** - $29/month (or $249/year)
- Everything in Pro
- 500MB file limit
- OCR for scanned PDFs
- API access
- Team accounts (5 users)
- Priority support

### Revenue Projections

**Month 1-3**: $100-850/month
**Month 6-12**: $1,000-4,000/month
**Year 2**: $10,000-25,000/month

See architecture doc in project root for detailed projections.

## Marketing Strategy

### SEO-Focused Growth
- Target keywords: "pdf to word converter", "compress pdf online", etc.
- Blog content: How-to guides, comparisons
- Free tool listings: AlternativeTo, Capterra, ProductHunt

### Launch Checklist
- [ ] Submit to ProductHunt
- [ ] Post on Reddit (r/productivity, r/SideProject)
- [ ] Create comparison pages (vs Adobe, Smallpdf, etc.)
- [ ] YouTube tutorials
- [ ] Chrome extension version

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/validate` - Validate token

### Conversions
- `POST /api/conversions/track` - Track conversion
- `POST /api/conversions/usage` - Get usage stats

### Payments
- `POST /api/payments/create-checkout-session` - Start subscription
- `POST /api/payments/webhook` - Stripe webhooks
- `GET /api/payments/subscription-status` - Get subscription info
- `POST /api/payments/cancel-subscription` - Cancel subscription

## Customization

### Branding
1. Update logo and colors in `css/styles.css` (CSS variables)
2. Change app name in `index.html` and `README.md`
3. Update meta tags for SEO

### Pricing
1. Modify pricing tiers in `index.html`
2. Update limits in `routes/conversions.js`
3. Create corresponding Stripe products

### Features
1. Add new converters in `js/converters.js`
2. Add UI in tool grid (`index.html`)
3. Update tool handlers in `js/app.js`

## Tech Stack

**Frontend:**
- Vanilla JavaScript
- PDF.js (render PDFs)
- jsPDF (create PDFs)
- pdf-lib (manipulate PDFs)
- TailwindCSS-inspired styles

**Backend:**
- Node.js + Express
- PostgreSQL
- JWT authentication
- Stripe API
- bcrypt for password hashing

## Security

- Passwords hashed with bcrypt
- JWT tokens for authentication
- SQL injection prevention (parameterized queries)
- Client-side file processing (files never stored on server for basic conversions)
- Environment variables for secrets
- HTTPS required in production

## Performance

- Client-side processing = no server load
- Optimized database queries with indexes
- CDN for static assets (recommended)
- Lazy loading for PDF libraries

## Support & Issues

For issues or questions:
1. Check the code comments
2. Review Stripe documentation for payment issues
3. Test locally before deploying

## License

MIT License - feel free to use this for your own projects

## Next Steps

1. **Immediate**: Set up and test locally
2. **Week 1**: Deploy to production
3. **Week 2**: Configure Stripe, test payments
4. **Week 3**: Launch marketing (ProductHunt, SEO content)
5. **Month 2**: Add advanced features (OCR, API)
6. **Ongoing**: Content marketing, SEO optimization

## Cost Breakdown

**Monthly Operating Costs:**
- Domain: $1/month (amortized)
- Hosting: $0-100/month (based on usage)
- Stripe fees: 2.9% + $0.30 per transaction
- Email (optional): $0-10/month

**Total Startup**: ~$40

**Break-even**: 5 Pro subscribers ($50/month revenue)

---

Built with ❤️ for aspiring SaaS entrepreneurs

**Good luck with your passive income journey!** 🚀
