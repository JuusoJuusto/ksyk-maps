// Script to generate rounded icons from the logo
// Run with: node generate-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎨 Icon Generator for KSYK Map');
console.log('================================\n');

// Check if sharp is available
let sharp;
try {
  sharp = (await import('sharp')).default;
  console.log('✅ Sharp library found - will generate icons automatically\n');
} catch (e) {
  console.log('⚠️  Sharp library not found');
  console.log('📝 Manual steps required:\n');
  console.log('1. Open create-rounded-icons.html in your browser');
  console.log('2. Upload public/kulosaaren_yhteiskoulu_logo.jpeg');
  console.log('3. Download all 4 generated icons');
  console.log('4. Save them to client/public/ folder\n');
  console.log('Or install sharp: npm install sharp\n');
  process.exit(0);
}

const inputImage = path.join(__dirname, 'public', 'kulosaaren_yhteiskoulu_logo.jpeg');
const outputDir = path.join(__dirname, 'client', 'public');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Icon sizes to generate
const icons = [
  { name: 'favicon.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 }
];

async function generateIcons() {
  console.log('🔄 Generating rounded icons...\n');
  
  for (const icon of icons) {
    try {
      const outputPath = path.join(outputDir, icon.name);
      
      // Create a circular mask
      const circleSize = icon.size;
      const circleSvg = `
        <svg width="${circleSize}" height="${circleSize}">
          <circle cx="${circleSize/2}" cy="${circleSize/2}" r="${circleSize/2}" fill="white"/>
        </svg>
      `;
      
      await sharp(inputImage)
        .resize(icon.size, icon.size, {
          fit: 'cover',
          position: 'center'
        })
        .composite([{
          input: Buffer.from(circleSvg),
          blend: 'dest-in'
        }])
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Created ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ Error creating ${icon.name}:`, error.message);
    }
  }
  
  console.log('\n🎉 All icons generated successfully!');
  console.log('📁 Icons saved to: client/public/\n');
}

// Check if input image exists
if (!fs.existsSync(inputImage)) {
  console.error('❌ Error: Logo file not found at:', inputImage);
  console.log('Please ensure public/kulosaaren_yhteiskoulu_logo.jpeg exists\n');
  process.exit(1);
}

generateIcons().catch(console.error);
