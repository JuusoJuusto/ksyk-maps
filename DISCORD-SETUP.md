# Discord Changelog Notifications Setup

This guide will help you set up automatic Discord notifications when you update the changelog.

## Option 1: Automatic with GitHub Actions (Recommended)

This will automatically post to Discord whenever you push changes to `CHANGELOG.md` or `package.json`.

### Step 1: Create Discord Webhook

1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Name it "KSYK Maps Updates" (or whatever you want)
5. Select the channel where you want notifications
6. Click **Copy Webhook URL**
7. Save it somewhere safe

### Step 2: Add Webhook to GitHub Secrets

1. Go to your GitHub repository: https://github.com/JuusoJuusto/ksyk-maps
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `DISCORD_WEBHOOK_URL`
5. Value: Paste your Discord webhook URL
6. Click **Add secret**

### Step 3: Done!

The GitHub Action is already set up in `.github/workflows/discord-notify.yml`.

Now whenever you:
- Push changes to `CHANGELOG.md`
- Push changes to `package.json` (version updates)

Discord will automatically receive a notification with:
- Version number
- Changelog excerpt
- Links to GitHub
- Timestamp

---

## Option 2: Manual Notification Script

If you want to manually send notifications, use the Node.js script.

### Setup

1. Set the Discord webhook URL as an environment variable:

**Windows (PowerShell):**
```powershell
$env:DISCORD_WEBHOOK_URL="your_webhook_url_here"
```

**Linux/Mac:**
```bash
export DISCORD_WEBHOOK_URL="your_webhook_url_here"
```

2. Run the script:
```bash
node scripts/notify-discord.js
```

### Add to package.json

You can add this to your `package.json` scripts:

```json
{
  "scripts": {
    "notify": "node scripts/notify-discord.js"
  }
}
```

Then run:
```bash
npm run notify
```

---

## Option 3: Add to Git Hook

Automatically send notification after every commit:

### Create post-commit hook:

**Windows:**
Create `.git/hooks/post-commit` (no extension):
```bash
#!/bin/sh
node scripts/notify-discord.js
```

**Linux/Mac:**
```bash
#!/bin/sh
node scripts/notify-discord.js
```

Make it executable:
```bash
chmod +x .git/hooks/post-commit
```

---

## Discord Message Format

The notification will look like this:

```
🚀 KSYK Maps v2.0.1 Released!
New version has been deployed to production.

📋 Changelog
```
[Changelog content here]
```

🔗 Links
View on GitHub | View Full Changelog

📧 Support
juuso.kaikula@ksyk.fi

KSYK Maps by OWL Apps
```

---

## Troubleshooting

### GitHub Action not working?
1. Check that the webhook URL is correctly set in GitHub Secrets
2. Go to **Actions** tab in GitHub to see if the workflow ran
3. Check the workflow logs for errors

### Manual script not working?
1. Make sure `DISCORD_WEBHOOK_URL` environment variable is set
2. Check that the webhook URL is valid
3. Make sure you have internet connection

### Webhook URL format
Should look like:
```
https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz
```

---

## Tips

1. **Test the webhook** - Send a test message first to make sure it works
2. **Keep webhook private** - Never commit the webhook URL to git
3. **Use GitHub Actions** - It's the most reliable method
4. **Customize the message** - Edit `.github/workflows/discord-notify.yml` to change the format

---

## Support

Need help? Contact: juuso.kaikula@ksyk.fi
