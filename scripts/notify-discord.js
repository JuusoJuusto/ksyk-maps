#!/usr/bin/env node

/**
 * Discord Changelog Notification Script
 * 
 * This script sends the latest changelog entry to Discord
 * Usage: node scripts/notify-discord.js
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Discord webhook URL from environment variable
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (!DISCORD_WEBHOOK_URL) {
  console.error('❌ Error: DISCORD_WEBHOOK_URL environment variable not set');
  console.log('\nTo set it:');
  console.log('  Windows: $env:DISCORD_WEBHOOK_URL="your_webhook_url"');
  console.log('  Linux/Mac: export DISCORD_WEBHOOK_URL="your_webhook_url"');
  process.exit(1);
}

// Read package.json for version
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = packageJson.version;

// Read CHANGELOG.md
const changelogPath = path.join(__dirname, '../CHANGELOG.md');
const changelog = fs.readFileSync(changelogPath, 'utf8');

// Extract the latest version section
const lines = changelog.split('\n');
let latestEntry = [];
let foundFirst = false;
let foundSecond = false;

for (const line of lines) {
  if (line.startsWith('## [')) {
    if (!foundFirst) {
      foundFirst = true;
      continue; // Skip the version header
    } else {
      foundSecond = true;
      break;
    }
  }
  if (foundFirst && !foundSecond) {
    latestEntry.push(line);
  }
}

const changelogText = latestEntry.join('\n').trim();

// Truncate if too long (Discord has a 2000 character limit per field)
const maxLength = 1900;
const truncatedChangelog = changelogText.length > maxLength 
  ? changelogText.substring(0, maxLength) + '\n\n... (truncated, see full changelog on GitHub)'
  : changelogText;

// Create Discord embed
const embed = {
  embeds: [{
    title: `🚀 KSYK Maps v${version} Released!`,
    description: 'New version has been deployed to production.',
    color: 3447003, // Blue color
    fields: [
      {
        name: '📋 Changelog',
        value: '```\n' + truncatedChangelog + '\n```'
      },
      {
        name: '🔗 Links',
        value: '[View on GitHub](https://github.com/JuusoJuusto/ksyk-maps)\n[View Full Changelog](https://github.com/JuusoJuusto/ksyk-maps/blob/main/CHANGELOG.md)\n[Live Site](https://ksykmaps.vercel.app)'
      },
      {
        name: '📧 Support',
        value: 'Email: juuso.kaikula@ksyk.fi\nDiscord: https://discord.gg/5ERZp9gUpr'
      }
    ],
    footer: {
      text: 'KSYK Maps by OWL Apps'
    },
    timestamp: new Date().toISOString()
  }]
};

// Parse webhook URL
const webhookUrl = new URL(DISCORD_WEBHOOK_URL);

// Send to Discord
const options = {
  hostname: webhookUrl.hostname,
  path: webhookUrl.pathname + webhookUrl.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = https.request(options, (res) => {
  if (res.statusCode === 204) {
    console.log('✅ Successfully sent changelog to Discord!');
    console.log(`📦 Version: ${version}`);
  } else {
    console.error(`❌ Discord API returned status code: ${res.statusCode}`);
    res.on('data', (d) => {
      console.error('Response:', d.toString());
    });
  }
});

req.on('error', (error) => {
  console.error('❌ Error sending to Discord:', error.message);
});

req.write(JSON.stringify(embed));
req.end();
