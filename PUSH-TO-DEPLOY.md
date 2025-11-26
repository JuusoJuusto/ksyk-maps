# 🚀 PUSH TO DEPLOY - Quick Guide

## ✅ Your Code is on GitHub!

Repository: https://github.com/JuusoJuusto/ksyk-maps

---

## 🎯 Connect to Vercel (One-Time Setup)

### Quick Steps:
1. **Go to:** https://vercel.com/dashboard
2. **Click:** "Add New" → "Project"
3. **Select:** "ksyk-maps" from GitHub
4. **Add Environment Variables** (see below)
5. **Click:** "Deploy"

### Environment Variables to Add:
```
USE_FIREBASE=true
NODE_ENV=production
SESSION_SECRET=ksyk-map-super-secret-key-change-in-production-2024
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=JuusoJuusto112@gmail.com
EMAIL_PASSWORD=vvzvffmzwbdibwrb
```

---

## 🔄 After Setup - Auto Deploy!

Every time you push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel automatically:
- ✅ Detects the push
- ✅ Builds your app
- ✅ Deploys to production
- ✅ Updates live URL

---

## 🎉 That's It!

**One-time setup:** Connect GitHub to Vercel (5 minutes)
**Forever after:** Just push to GitHub, auto-deploys!

---

**Setup now:** https://vercel.com/dashboard
