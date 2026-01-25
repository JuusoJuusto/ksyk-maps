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

// Parse changelog sections
const sections = {
  added: [],
  fixed: [],
  improved: [],
  changed: []
};

let currentSection = null;
for (const line of changelogText.split('\n')) {
  if (line.includes('**Added:**')) currentSection = 'added';
  else if (line.includes('**Fixed:**')) currentSection = 'fixed';
  else if (line.includes('**Improved:**')) currentSection = 'improved';
  else if (line.includes('**Changed:**')) currentSection = 'changed';
  else if (line.trim().startsWith('-') && currentSection) {
    sections[currentSection].push(line.trim());
  }
}

// Create Discord embed with better formatting
const fields = [];

if (sections.added.length > 0) {
  fields.push({
    name: '✨ Added',
    value: sections.added.join('\n') || 'No additions',
    inline: false
  });
}

if (sections.fixed.length > 0) {
  fields.push({
    name: '🔧 Fixed',
    value: sections.fixed.join('\n') || 'No fixes',
    inline: false
  });
}

if (sections.improved.length > 0) {
  fields.push({
    name: '⚡ Improved',
    value: sections.improved.join('\n') || 'No improvements',
    inline: false
  });
}

if (sections.changed.length > 0) {
  fields.push({
    name: '🔄 Changed',
    value: sections.changed.join('\n') || 'No changes',
    inline: false
  });
}

// Add links field
fields.push({
  name: '🔗 Links',
  value: '[🌐 Live Site](https://ksykmaps.vercel.app) • [📦 GitHub](https://github.com/JuusoJuusto/ksyk-maps) • [📋 Changelog](https://github.com/JuusoJuusto/ksyk-maps/blob/main/CHANGELOG.md)',
  inline: false
});

// Add support field
fields.push({
  name: '💬 Support',
  value: '📧 juuso.kaikula@ksyk.fi\n💬 [Discord](https://discord.gg/5ERZp9gUpr)',
  inline: false
});

const embed = {
  embeds: [{
    title: `🚀 KSYK Maps v${version} Released!`,
    description: 'New version has been deployed to production.',
    color: 3447003, // Blue color
    fields: fields,
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
