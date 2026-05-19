@echo off
REM STEM-tutorointi Complete Setup & Execution Script (Windows)
REM This script sets up the entire platform and runs it on localhost:3000

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║     STEM-tutorointi Platform Setup ^& Execution Script          ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0apps\web"
echo Working directory: %CD%

REM Step 1: Create directory structure
echo.
echo 📁 Creating directory structure...
for %%D in (app\api\auth\login app\api\auth\register app\api\auth\refresh app\api\auth\logout app\api\auth\session app\api\auth\verify app\dashboard app\login app\register app\onboarding app\admin app\classrooms app\ai app\analytics app\subscriptions app\account lib\auth lib\security lib\services components\auth components\ui components\forms components\dashboard server hooks types utils styles) do (
    if not exist "%%D" mkdir "%%D"
)
echo ✓ Directories created

REM Step 2: Move page files
echo.
echo 📄 Organizing page files...
if exist "page.tsx" move /y page.tsx app\page.tsx > nul
if exist "layout.tsx" move /y layout.tsx app\layout.tsx > nul
if exist "login_page.tsx" move /y login_page.tsx app\login\page.tsx > nul
if exist "register_page.tsx" move /y register_page.tsx app\register\page.tsx > nul
if exist "dashboard_page.tsx" move /y dashboard_page.tsx app\dashboard\page.tsx > nul
if exist "providers.tsx" move /y providers.tsx lib\providers.tsx > nul
if exist "serverSession.ts" move /y serverSession.ts lib\serverSession.ts > nul
if exist "SignOutButton.tsx" move /y SignOutButton.tsx components\auth\SignOutButton.tsx > nul
echo ✓ Pages organized

REM Step 3: Move API routes
echo.
echo 🔌 Organizing API routes...
if exist "login_route.ts" move /y login_route.ts app\api\auth\login\route.ts > nul
if exist "register_route.ts" move /y register_route.ts app\api\auth\register\route.ts > nul
if exist "refresh_route.ts" move /y refresh_route.ts app\api\auth\refresh\route.ts > nul
if exist "logout_route.ts" move /y logout_route.ts app\api\auth\logout\route.ts > nul
if exist "session_route.ts" move /y session_route.ts app\api\auth\session\route.ts > nul
if exist "verify_route.ts" move /y verify_route.ts app\api\auth\verify\route.ts > nul
echo ✓ API routes organized

REM Step 4: Move core auth files
echo.
echo 🔐 Organizing authentication files...
if exist "security.ts" move /y security.ts lib\security\index.ts > nul
if exist "authService.ts" move /y authService.ts lib\auth\service.ts > nul
if exist "csrf.ts" move /y csrf.ts lib\security\csrf.ts > nul
if exist "rateLimiter.ts" move /y rateLimiter.ts lib\security\rateLimiter.ts > nul
if exist "apiHandlers.ts" move /y apiHandlers.ts lib\auth\handlers.ts > nul
if exist "authHelpers.ts" move /y authHelpers.ts lib\auth\helpers.ts > nul
if exist "prismaClient.ts" move /y prismaClient.ts lib\prismaClient.ts > nul
if exist "serverAuth.ts" move /y serverAuth.ts lib\auth\serverAuth.ts > nul
echo ✓ Auth files organized

REM Step 5: Move hooks and context
echo.
echo ⚛️  Organizing React components...
if exist "AuthProvider.tsx" move /y AuthProvider.tsx app\providers\AuthProvider.tsx > nul
if exist "useAuth.tsx" move /y useAuth.tsx hooks\useAuth.ts > nul
echo ✓ React components organized

REM Step 6: Update middleware location
echo.
echo 🛡️  Setting up middleware...
if exist "middleware.ts" (
    if not exist "src" mkdir src
    move /y middleware.ts src\middleware.ts > nul
)
echo ✓ Middleware configured

REM Step 7: Install dependencies
echo.
echo 📦 Installing dependencies...
if not exist "node_modules" (
    call npm install
    call npm install bcryptjs jsonwebtoken @prisma/client zod cookie-parser
    echo ✓ Dependencies installed
) else (
    echo ✓ Dependencies already installed
)

REM Step 8: Initialize Prisma
echo.
echo 🗄️  Initializing database...
call npx prisma generate
echo ✓ Prisma client generated

REM Step 9: Run migrations
echo.
echo 📊 Running database migrations...
call npx prisma migrate deploy 2>nul || call npx prisma migrate dev --name init
echo ✓ Database initialized

REM Step 10: Start development server
echo.
echo ════════════════════════════════════════════════════════════════
echo ✅ Setup complete!
echo ════════════════════════════════════════════════════════════════
echo.
echo Starting development server on http://localhost:3000...
echo.
echo 📚 Test the platform:
echo    1. Open http://localhost:3000
echo    2. Click 'Get started' to register
echo    3. Create account with test credentials
echo    4. Login and access dashboard
echo    5. Test sign out
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev

endlocal
