# 🚀 KSYK Campus Map - Deployment Guide

## Quick Deployment Options

### Option 1: Replit (Easiest - 5 minutes)
**Best for: Quick sharing, testing, free hosting**

1. **Go to [Replit.com](https://replit.com)**
2. **Create account** (free)
3. **Click "Create Repl"**
4. **Import from GitHub:**
   - Click "Import from GitHub"
   - Paste your repository URL
   - Click "Import"
5. **Set Environment Variables:**
   - Click "Secrets" (lock icon)
   - Add your Firebase credentials from `.env`
6. **Click "Run"**
7. **Share the URL** - Replit gives you a public URL automatically!

**Pros:** Free, instant, automatic HTTPS, easy sharing
**Cons:** May sleep after inactivity (free tier)

---

### Option 2: Vercel (Recommended - 10 minutes)
**Best for: Production, fast, reliable, free**

1. **Go to [Vercel.com](https://vercel.com)**
2. **Sign up** with GitHub
3. **Click "New Project"**
4. **Import your repository**
5. **Configure:**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. **Add Environment Variables:**
   - Go to Settings → Environment Variables
   - Add all variables from your `.env` file
7. **Deploy!**

**Pros:** Free, super fast, automatic deployments, custom domains
**Cons:** Need to set up database separately

---

### Option 3: Railway (Best for Full-Stack - 15 minutes)
**Best for: Production with database included**

1. **Go to [Railway.app](https://railway.app)**
2. **Sign up** with GitHub
3. **Click "New Project"**
4. **Deploy from GitHub repo**
5. **Add PostgreSQL:**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway automatically connects it
6. **Add Environment Variables:**
   - Click your service → Variables
   - Add Firebase credentials
7. **Deploy!**

**Pros:** Includes database, easy setup, $5/month free credit
**Cons:** Paid after free credit

---

### Option 4: Render (Free Tier - 20 minutes)
**Best for: Free full-stack hosting**

1. **Go to [Render.com](https://render.com)**
2. **Sign up** with GitHub
3. **Create Web Service:**
   - Click "New" → "Web Service"
   - Connect your repository
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. **Add PostgreSQL:**
   - Click "New" → "PostgreSQL"
   - Copy connection string
5. **Add Environment Variables**
6. **Deploy!**

**Pros:** Free tier, includes database
**Cons:** Slower than paid options, may sleep

---

## Environment Variables You Need

```env
# Firebase (Required)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Database (if using PostgreSQL)
DATABASE_URL=your_postgres_url

# Session Secret
SESSION_SECRET=your_random_secret_key
```

---

## Quick Start Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Sharing Your App

### After Deployment:

1. **Get your URL** from the hosting platform
2. **Share with others:**
   - Send them the URL
   - They can access immediately
   - No installation needed!

3. **Admin Access:**
   - URL: `https://your-app.com/admin-login`
   - Email: `JuusoJuusto112@gmail.com`
   - Password: `Juusto2012!`

4. **Create More Admins:**
   - Login as owner
   - Go to Admin Dashboard → Users tab
   - Click "Add User"
   - Send them their credentials

---

## Custom Domain (Optional)

### Vercel:
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as shown

### Railway:
1. Go to Settings → Domains
2. Click "Generate Domain" or add custom

---

## Troubleshooting

### App won't start?
- Check environment variables are set
- Make sure Firebase credentials are correct
- Check build logs for errors

### Database errors?
- Verify DATABASE_URL is correct
- Check Firebase service account key
- Run migrations if needed

### Can't login?
- Check owner credentials in code
- Verify Firebase is initialized
- Check browser console for errors

---

## Best Practices

1. **Use HTTPS** - All platforms provide it automatically
2. **Backup your data** - Export from Firebase regularly
3. **Monitor usage** - Check Firebase quotas
4. **Update regularly** - Pull latest changes from GitHub
5. **Test before sharing** - Make sure everything works

---

## Cost Estimates

- **Replit Free:** $0/month (with sleep)
- **Vercel Free:** $0/month (hobby projects)
- **Railway:** $5/month free credit, then ~$10/month
- **Render Free:** $0/month (with sleep)

---

## Need Help?

1. Check the logs in your hosting platform
2. Review Firebase console for errors
3. Test locally first with `npm run dev`
4. Check environment variables are set correctly

---

## Quick Deployment Checklist

- [ ] Choose hosting platform
- [ ] Create account
- [ ] Import/connect repository
- [ ] Add environment variables
- [ ] Deploy
- [ ] Test the URL
- [ ] Share with others!

**That's it! Your KSYK Campus Map is now live! 🎉**
