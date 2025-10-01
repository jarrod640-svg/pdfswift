# PDFSwift Deployment Guide

Complete step-by-step guide to deploy your PDF converter app to production.

## Option 1: Railway (Recommended - Easiest)

Railway is perfect for full-stack apps and includes a PostgreSQL database.

### Steps:

1. **Prepare Your Code**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub**
   - Create a new repo on GitHub
   - Push your code:
   ```bash
   git remote add origin https://github.com/yourusername/pdfswift.git
   git push -u origin main
   ```

3. **Deploy on Railway**
   - Go to https://railway.app
   - Sign up/login with GitHub
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your pdfswift repo
   - Railway will auto-detect Node.js

4. **Add PostgreSQL**
   - In your project, click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway will auto-provision and link it

5. **Set Environment Variables**
   - Click on your web service
   - Go to "Variables" tab
   - Add all variables from `.env.example`:
     ```
     NODE_ENV=production
     JWT_SECRET=[generate random 32+ char string]
     STRIPE_SECRET_KEY=[your stripe key]
     STRIPE_PUBLISHABLE_KEY=[your stripe key]
     STRIPE_WEBHOOK_SECRET=[from stripe dashboard]
     APP_URL=https://your-app.railway.app
     ```
   - `DATABASE_URL` is automatically set by Railway

6. **Run Database Schema**
   - In Railway, click on PostgreSQL service
   - Click "Connect" → "psql"
   - Copy/paste content from `config/database.sql`
   - Run it

7. **Set Up Stripe Webhook**
   - Get your Railway URL (e.g., `https://pdfswift.up.railway.app`)
   - In Stripe Dashboard → Webhooks → Add endpoint
   - URL: `https://your-app.railway.app/api/payments/webhook`
   - Events: Select all `checkout`, `customer.subscription`, and `invoice` events
   - Copy webhook secret to Railway environment variables

8. **Deploy!**
   - Railway auto-deploys on git push
   - Your app is live! 🎉

**Cost**: $5-20/month (includes database, scales with usage)

---

## Option 2: Vercel (Frontend) + Railway (Backend)

Split frontend and backend for optimal performance.

### Frontend (Vercel):

1. **Separate Frontend Files**
   - Create `vercel.json`:
   ```json
   {
     "version": 2,
     "builds": [
       { "src": "index.html", "use": "@vercel/static" }
     ]
   }
   ```

2. **Deploy to Vercel**
   ```bash
   npm i -g vercel
   vercel
   ```

3. **Set Environment Variables**
   - In Vercel dashboard, add:
     ```
     NEXT_PUBLIC_API_URL=https://your-backend.railway.app
     ```

### Backend (Railway):

1. Follow Railway steps above but only deploy backend files
2. Configure CORS to allow Vercel domain

**Cost**: $0-5/month (Vercel free tier + Railway backend)

---

## Option 3: DigitalOcean App Platform

Full-stack deployment with more control.

1. **Push to GitHub** (same as Railway)

2. **Create App on DigitalOcean**
   - Go to https://cloud.digitalocean.com/apps
   - Create App → GitHub → Select repo
   - Detect Node.js app

3. **Add Database**
   - In app settings, add PostgreSQL database
   - DigitalOcean connects it automatically

4. **Environment Variables**
   - Add all env vars in app settings

5. **Run Database Schema**
   - Use DigitalOcean console or pgAdmin

**Cost**: $12-25/month (includes database)

---

## Option 4: Traditional VPS (DigitalOcean Droplet)

Maximum control, requires more setup.

### Steps:

1. **Create Droplet**
   - Ubuntu 22.04 LTS
   - $6/month plan minimum

2. **SSH into server**
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Install PostgreSQL**
   ```bash
   sudo apt install postgresql postgresql-contrib
   sudo -u postgres psql
   CREATE DATABASE pdfswift;
   CREATE USER pdfuser WITH PASSWORD 'yourpassword';
   GRANT ALL PRIVILEGES ON DATABASE pdfswift TO pdfuser;
   \q
   ```

5. **Install Nginx**
   ```bash
   sudo apt install nginx
   ```

6. **Clone Your Code**
   ```bash
   cd /var/www
   git clone https://github.com/yourusername/pdfswift.git
   cd pdfswift
   npm install
   ```

7. **Set up .env**
   ```bash
   nano .env
   # Add all your environment variables
   ```

8. **Run Database Schema**
   ```bash
   psql -U pdfuser -d pdfswift < config/database.sql
   ```

9. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name pdfswift
   pm2 startup
   pm2 save
   ```

10. **Configure Nginx**
    ```bash
    sudo nano /etc/nginx/sites-available/pdfswift
    ```

    Add:
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

    ```bash
    sudo ln -s /etc/nginx/sites-available/pdfswift /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

11. **Set up SSL with Let's Encrypt**
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d yourdomain.com
    ```

**Cost**: $6-12/month

---

## Post-Deployment Checklist

### 1. DNS Configuration
- Point your domain to your server/hosting
- Wait for DNS propagation (up to 48 hours)

### 2. Test All Features
- [ ] Landing page loads
- [ ] User signup/login works
- [ ] Free tier conversions work
- [ ] Usage tracking works
- [ ] Stripe checkout works (test mode first!)
- [ ] Webhooks receive events
- [ ] Subscription upgrade works

### 3. Stripe Configuration

**Create Products:**
1. Stripe Dashboard → Products → Add Product
2. Create:
   - Pro Monthly ($9.99)
   - Pro Yearly ($79)
   - Business Monthly ($29)
   - Business Yearly ($249)
3. Copy Price IDs to environment variables

**Webhook Events to Listen:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

### 4. Security Hardening

- [ ] Change all default passwords
- [ ] Use strong JWT secret (32+ random characters)
- [ ] Enable HTTPS only
- [ ] Set secure headers
- [ ] Configure CORS properly
- [ ] Regular security updates

### 5. Monitoring

**Set up monitoring:**
- Railway/Vercel: Built-in monitoring
- VPS: Install monitoring tools

**Track:**
- Server uptime
- Error logs
- Database performance
- Stripe webhook failures

### 6. Backups

**Database Backups:**
- Railway: Automatic daily backups
- DigitalOcean: Enable automated backups
- VPS: Set up cron job for pg_dump

```bash
# Example backup cron (VPS)
0 2 * * * pg_dump pdfswift > /backups/pdfswift-$(date +\%Y\%m\%d).sql
```

---

## Scaling Strategy

### Phase 1: 0-1,000 users
- Single server/container
- Shared database
- **Cost**: $5-20/month

### Phase 2: 1,000-10,000 users
- Multiple instances (load balancing)
- Dedicated database
- CDN for static assets
- **Cost**: $50-150/month

### Phase 3: 10,000+ users
- Auto-scaling
- Database replication
- Redis caching
- Separate API server
- **Cost**: $200-500/month

---

## Troubleshooting

### Database Connection Fails
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection string
echo $DATABASE_URL
```

### Stripe Webhooks Not Working
- Check webhook secret matches
- Verify endpoint URL is correct
- Check server logs for errors
- Test with Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:3000/api/payments/webhook
  ```

### App Won't Start
```bash
# Check logs
pm2 logs pdfswift

# Restart app
pm2 restart pdfswift
```

### CORS Errors
- Add your frontend domain to CORS whitelist in `server.js`
- Ensure credentials are included in fetch requests

---

## Maintenance

### Regular Tasks
- **Daily**: Check error logs
- **Weekly**: Review user signups, conversions
- **Monthly**: Database cleanup, backup verification
- **Quarterly**: Security updates, dependency updates

### Updates
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Restart app
pm2 restart pdfswift
```

---

## Domain Setup

### Recommended Registrars
- Namecheap ($8-12/year)
- Google Domains ($12/year)
- Cloudflare ($8/year)

### DNS Configuration
```
A Record: @ → Your server IP
A Record: www → Your server IP
```

Or for Railway/Vercel:
```
CNAME: @ → your-app.railway.app
CNAME: www → your-app.railway.app
```

---

## Go Live Checklist

- [ ] Code deployed and tested
- [ ] Database schema loaded
- [ ] Environment variables set
- [ ] Stripe products created
- [ ] Webhooks configured
- [ ] Domain pointed
- [ ] SSL certificate active
- [ ] Test signup/login
- [ ] Test free conversion
- [ ] Test paid conversion (test mode)
- [ ] Switch Stripe to live mode
- [ ] Test real payment
- [ ] Submit to ProductHunt
- [ ] Post on social media

---

**You're ready to launch!** 🚀

Good luck with your SaaS journey!
