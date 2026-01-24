# Quick Discord Setup (5 Minutes)

## Step 1: Get Discord Webhook (2 min)

1. Open Discord → Your Server
2. Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Name: "KSYK Maps Updates"
5. Choose channel
6. **Copy Webhook URL** (looks like: `https://discord.com/api/webhooks/...`)

## Step 2: Add to GitHub (2 min)

1. Go to: https://github.com/JuusoJuusto/ksyk-maps/settings/secrets/actions
2. Click "New repository secret"
3. Name: `DISCORD_WEBHOOK_URL`
4. Value: Paste your webhook URL
5. Click "Add secret"

## Step 3: Done! (1 min)

That's it! Now every time you push changes to:
- `CHANGELOG.md`
- `package.json`

Discord will automatically get a notification with the changelog!

**✅ Note:** The curl command error has been fixed in the latest version.

---

## Test It Now

Want to test it? Just push a small change:

```bash
git add .
git commit -m "test: Discord notification"
git push
```

Check your Discord channel!

---

## Manual Notification (Optional)

If you want to manually send a notification:

```bash
# Set webhook URL (one time)
$env:DISCORD_WEBHOOK_URL="your_webhook_url"

# Send notification
npm run notify:discord
```

---

## What It Looks Like

Discord will show:
- 🚀 Version number
- 📋 Latest changelog
- 🔗 GitHub links
- 📧 Support email
- ⏰ Timestamp

---

**Need help?** juuso.kaikula@ksyk.fi
