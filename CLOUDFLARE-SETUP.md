# 🚀 KSYK Maps - Cloudflare Tunnel Setup (5 Minutes)

## Why Cloudflare Tunnel?
- ✅ **Free forever**
- ✅ **Fast and reliable**
- ✅ **HTTPS included**
- ✅ **No account needed for quick tunnels**
- ✅ **Can use custom subdomain** (with account)

---

## Quick Setup (No Account Needed)

### Step 1: Install Cloudflare Tunnel

**Option A: Using winget (Recommended)**
```powershell
# Run in PowerShell as Administrator
winget install --id Cloudflare.cloudflared
```

**Option B: Direct Download**
1. Go to: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
2. Download for Windows
3. Install the .msi file

### Step 2: Start Your KSYK Maps App
```bash
# In your project folder
npm run dev
```
Wait for it to show: `serving on port 3000`

### Step 3: Create Public Tunnel
```bash
# Open a NEW terminal/PowerShell window
cloudflared tunnel --url http://localhost:3000
```

### Step 4: Get Your URL! 🎉
Cloudflare will show you a URL like:
```
https://random-words-1234.trycloudflare.com
```

**Share this URL with anyone!** They can access:
- Main app: `https://your-url.trycloudflare.com`
- Admin: `https://your-url.trycloudflare.com/admin-login`

---

## Custom Subdomain (Optional - Requires Free Account)

Want `ksykmaps.yourdomain.com`? Follow these steps:

### Step 1: Create Cloudflare Account
1. Go to https://dash.cloudflare.com/sign-up
2. Sign up (free)
3. Add your domain (or use a free subdomain)

### Step 2: Login to Cloudflare
```bash
cloudflared tunnel login
```
This opens a browser - select your domain

### Step 3: Create Named Tunnel
```bash
# Create tunnel named "ksykmaps"
cloudflared tunnel create ksykmaps
```

### Step 4: Configure DNS
```bash
# Route your subdomain to the tunnel
cloudflared tunnel route dns ksykmaps ksykmaps.yourdomain.com
```

### Step 5: Create Config File
Create `config.yml` in `C:\Users\YourName\.cloudflared\`:
```yaml
tunnel: ksykmaps
credentials-file: C:\Users\YourName\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: ksykmaps.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

### Step 6: Run Your Tunnel
```bash
cloudflared tunnel run ksykmaps
```

Now accessible at: `https://ksykmaps.yourdomain.com` 🎉

---

## Keep It Running

### Option 1: Keep Terminal Open
Just leave the terminal running with `cloudflared tunnel`

### Option 2: Run as Windows Service
```bash
# Install as service
cloudflared service install

# Start service
cloudflared service start
```

### Option 3: Use Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: "At startup"
4. Action: Start program
5. Program: `cloudflared`
6. Arguments: `tunnel --url http://localhost:3000`

---

## Quick Commands Reference

```bash
# Quick tunnel (no account)
cloudflared tunnel --url http://localhost:3000

# Login to Cloudflare
cloudflared tunnel login

# Create named tunnel
cloudflared tunnel create ksykmaps

# List tunnels
cloudflared tunnel list

# Run named tunnel
cloudflared tunnel run ksykmaps

# Delete tunnel
cloudflared tunnel delete ksykmaps
```

---

## Troubleshooting

### "cloudflared not found"
- Restart your terminal after installation
- Or add to PATH: `C:\Program Files\cloudflared\`

### "Connection refused"
- Make sure your app is running on port 3000
- Check with: `npm run dev`

### "Tunnel already exists"
- Use a different name
- Or delete old tunnel: `cloudflared tunnel delete ksykmaps`

---

## Security Tips

1. **Don't share admin credentials publicly**
2. **Use strong passwords**
3. **Monitor access logs in Cloudflare dashboard**
4. **Can add authentication in Cloudflare dashboard**

---

## Cost

- **Quick tunnels**: FREE forever
- **Named tunnels**: FREE forever
- **Custom domains**: FREE (if you own domain)
- **Advanced features**: FREE on Cloudflare Free plan

---

## Next Steps

1. ✅ Install cloudflared
2. ✅ Start your app
3. ✅ Run tunnel
4. ✅ Share URL
5. 🎉 Done!

**Your KSYK Maps is now accessible to anyone, anywhere!**

---

## Alternative: ngrok (If Cloudflare doesn't work)

```bash
# Install ngrok
winget install ngrok

# Run tunnel
ngrok http 3000

# For custom subdomain (paid):
ngrok http 3000 --subdomain=ksykmaps
```

---

Need help? Check the logs or visit:
- Cloudflare Docs: https://developers.cloudflare.com/cloudflare-one/
- KSYK Maps Issues: Your GitHub repo
