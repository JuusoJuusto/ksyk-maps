#!/bin/bash

# ============================================
# STEM Genius - Production Setup Script
# ============================================

set -e

echo "🚀 STEM Genius - Production Setup"
echo "=================================="
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ required (found: $(node -v))"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"
echo ""

# Check environment variables
echo "🔐 Checking environment variables..."
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "   Copy .env.example to .env and fill in your credentials"
    exit 1
fi

# Check required env vars
REQUIRED_VARS=("DATABASE_URL" "OPENAI_API_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$var=" .env; then
        echo "❌ Error: $var not found in .env"
        exit 1
    fi
done
echo "✅ Environment variables configured"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false
echo "✅ Dependencies installed"
echo ""

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"
echo ""

# Push database schema
echo "🗄️  Pushing database schema..."
npx prisma db push --accept-data-loss
echo "✅ Database schema pushed"
echo ""

# Seed database
echo "🌱 Seeding database..."
npx prisma db seed
echo "✅ Database seeded"
echo ""

# Build application
echo "🏗️  Building application..."
npm run build
echo "✅ Application built"
echo ""

# Run type check
echo "🔍 Running type check..."
npm run type-check
echo "✅ Type check passed"
echo ""

echo "=================================="
echo "✅ Production setup complete!"
echo ""
echo "Next steps:"
echo "1. Review your .env configuration"
echo "2. Test locally: npm run start"
echo "3. Deploy to Vercel: vercel --prod"
echo ""
echo "🎉 STEM Genius is ready for production!"
