@echo off
echo ========================================
echo   KSYK MAP - VERCEL DEPLOYMENT
echo ========================================
echo.
echo Checking build...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ Build failed! Fix errors before deploying.
    pause
    exit /b 1
)

echo.
echo ✅ Build successful!
echo.
echo Deploying to Vercel...
echo.

vercel --prod

echo.
echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your app is now live on Vercel!
echo.
echo Next steps:
echo 1. Test on mobile devices
echo 2. Configure custom domain (optional)
echo 3. Monitor in Vercel dashboard
echo.
pause
