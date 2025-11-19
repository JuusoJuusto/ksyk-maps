# 🚀 Share Your KSYK Maps RIGHT NOW!

## Super Quick (2 Commands)

### 1️⃣ Install Cloudflare Tunnel
**Copy and paste this in PowerShell (as Administrator):**
```powershell
winget install --id Cloudflare.cloudflared
```

### 2️⃣ Start Sharing
**Copy and paste these commands:**
```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Create public URL
cloudflared tunnel --url http://localhost:3000
```

### 3️⃣ Share the URL! 🎉
Cloudflare shows you a URL like:
```
https://random-words.trycloudflare.com
```

**Send this to anyone!** They can access your KSYK Maps instantly!

---

## That's It!

✅ No account needed
✅ Free forever
✅ HTTPS included
✅ Works anywhere
✅ Takes 2 minutes

---

## Admin Access

Share these with admins:
- **URL**: `https://your-url.trycloudflare.com/admin-login`
- **Email**: `JuusoJuusto112@gmail.com`
- **Password**: `Juusto2012!`

---

## Want Custom URL like "ksykmaps.com"?

See **[CLOUDFLARE-SETUP.md](./CLOUDFLARE-SETUP.md)** for:
- Custom subdomain setup
- Permanent tunnel
- Run as Windows service

---

## Troubleshooting

**"cloudflared not found"?**
- Close and reopen your terminal
- Or restart your computer

**"Connection refused"?**
- Make sure `npm run dev` is running
- Check it shows "serving on port 3000"

**Need help?**
- See [CLOUDFLARE-SETUP.md](./CLOUDFLARE-SETUP.md)
- Or use ngrok instead: `winget install ngrok` then `ngrok http 3000`

---

**You're ready to share! 🚀**
