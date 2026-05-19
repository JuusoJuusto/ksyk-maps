#!/bin/bash
# STEM-tutorointi Complete Setup & Execution Script
# This script sets up the entire platform and runs it on localhost:3000

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     STEM-tutorointi Platform Setup & Execution Script          ║"
echo "╚════════════════════════════════════════════════════════════════╝"

cd "$(dirname "$0")/apps/web"
echo "Working directory: $(pwd)"

# Step 1: Create directory structure
echo ""
echo "📁 Creating directory structure..."
mkdir -p app/api/auth/{login,register,refresh,logout,session,verify,password/{request,confirm},sessions/{list,revoke}}
mkdir -p app/{dashboard,login,register,onboarding,admin,classrooms,ai,analytics,subscriptions,account}
mkdir -p lib/{auth,security,services}
mkdir -p components/{auth,ui,forms,dashboard}
mkdir -p server
mkdir -p hooks
mkdir -p types
mkdir -p utils
mkdir -p styles
echo "✓ Directories created"

# Step 2: Move page files
echo ""
echo "📄 Organizing page files..."
[ -f "page.tsx" ] && mv -v page.tsx app/page.tsx
[ -f "layout.tsx" ] && mv -v layout.tsx app/layout.tsx
[ -f "login_page.tsx" ] && mv -v login_page.tsx app/login/page.tsx
[ -f "register_page.tsx" ] && mv -v register_page.tsx app/register/page.tsx
[ -f "dashboard_page.tsx" ] && mv -v dashboard_page.tsx app/dashboard/page.tsx
[ -f "providers.tsx" ] && mv -v providers.tsx lib/providers.tsx
[ -f "serverSession.ts" ] && mv -v serverSession.ts lib/serverSession.ts
[ -f "SignOutButton.tsx" ] && mv -v SignOutButton.tsx components/auth/SignOutButton.tsx
echo "✓ Pages organized"

# Step 3: Move API routes
echo ""
echo "🔌 Organizing API routes..."
[ -f "login_route.ts" ] && mv -v login_route.ts app/api/auth/login/route.ts
[ -f "register_route.ts" ] && mv -v register_route.ts app/api/auth/register/route.ts
[ -f "refresh_route.ts" ] && mv -v refresh_route.ts app/api/auth/refresh/route.ts
[ -f "logout_route.ts" ] && mv -v logout_route.ts app/api/auth/logout/route.ts
[ -f "session_route.ts" ] && mv -v session_route.ts app/api/auth/session/route.ts
[ -f "verify_route.ts" ] && mv -v verify_route.ts app/api/auth/verify/route.ts
echo "✓ API routes organized"

# Step 4: Move core auth files to lib/auth
echo ""
echo "🔐 Organizing authentication files..."
[ -f "security.ts" ] && mv -v security.ts lib/security/index.ts
[ -f "authService.ts" ] && mv -v authService.ts lib/auth/service.ts
[ -f "csrf.ts" ] && mv -v csrf.ts lib/security/csrf.ts
[ -f "rateLimiter.ts" ] && mv -v rateLimiter.ts lib/security/rateLimiter.ts
[ -f "apiHandlers.ts" ] && mv -v apiHandlers.ts lib/auth/handlers.ts
[ -f "authHelpers.ts" ] && mv -v authHelpers.ts lib/auth/helpers.ts
[ -f "prismaClient.ts" ] && mv -v prismaClient.ts lib/prismaClient.ts
[ -f "serverAuth.ts" ] && mv -v serverAuth.ts lib/auth/serverAuth.ts
echo "✓ Auth files organized"

# Step 5: Move hooks and context
echo ""
echo "⚛️  Organizing React components..."
[ -f "AuthProvider.tsx" ] && mv -v AuthProvider.tsx app/providers/AuthProvider.tsx
[ -f "useAuth.tsx" ] && mv -v useAuth.tsx hooks/useAuth.ts
echo "✓ React components organized"

# Step 6: Update middleware location
echo ""
echo "🛡️  Setting up middleware..."
[ -f "middleware.ts" ] && [ ! -f "src/middleware.ts" ] && mkdir -p src && mv -v middleware.ts src/middleware.ts
echo "✓ Middleware configured"

# Step 7: Install dependencies
echo ""
echo "📦 Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    npm install bcryptjs jsonwebtoken @prisma/client zod cookie-parser
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

# Step 8: Initialize Prisma
echo ""
echo "🗄️  Initializing database..."
npx prisma generate
echo "✓ Prisma client generated"

# Step 9: Run migrations
echo ""
echo "📊 Running database migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init
echo "✓ Database initialized"

# Step 10: Start development server
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Setup complete!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Starting development server on http://localhost:3000..."
echo ""
echo "📚 Test the platform:"
echo "   1. Open http://localhost:3000"
echo "   2. Click 'Get started' to register"
echo "   3. Create account with test credentials"
echo "   4. Login and access dashboard"
echo "   5. Test sign out"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
