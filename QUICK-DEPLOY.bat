@echo off
echo ========================================
echo   KSYK MAP - VERCEL DEPLOYMENT
echo ========================================
echo.
echo Step 1: Login to Vercel
echo.
echo This will open your browser to login.
echo Press any key to continue...
pause >nul

vercel login

echo.
echo ========================================
echo Step 2: Deploy to Production
echo ========================================
echo.
echo Deploying your app...
echo.

vercel --prod

echo.
echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your app is now live!
echo.
echo IMPORTANT: Add environment variables in Vercel Dashboard:
echo 1. Go to https://vercel.com/dashboard
echo 2. Find your project
echo 3. Settings -^> Environment Variables
echo 4. Add the variables from .env file
echo 5. Redeploy: vercel --prod
echo.
echo See DEPLOY-INSTRUCTIONS.md for details.
echo.
pause
