@echo off
echo ========================================
echo DEPLOYING TO VERCEL
echo ========================================
echo.

echo [Step 1/5] Checking Git status...
git status
echo.

echo [Step 2/5] Adding all changes to Git...
git add .
echo ✓ Files added
echo.

echo [Step 3/5] Committing changes...
git commit -m "Add email system with Resend and app customization settings"
if %errorlevel% equ 0 (
    echo ✓ Changes committed
) else (
    echo ℹ No changes to commit or commit failed
)
echo.

echo [Step 4/5] Pushing to GitHub...
git push
if %errorlevel% equ 0 (
    echo ✓ Pushed to GitHub successfully!
) else (
    echo ✗ Push failed. Check your Git credentials.
    pause
    exit /b 1
)
echo.

echo [Step 5/5] Vercel will auto-deploy from GitHub
echo.
echo ========================================
echo IMPORTANT: UPDATE VERCEL ENVIRONMENT VARIABLE
echo ========================================
echo.
echo Go to: https://vercel.com/dashboard
echo.
echo 1. Select your project (ksykmaps)
echo 2. Go to Settings → Environment Variables
echo 3. Add or update this variable:
echo.
echo    Name:  RESEND_API_KEY
echo    Value: re_cjxCHufh_6dt8g21HwgeMNLvn81wbdcMC
echo.
echo 4. Click "Save"
echo 5. Go to Deployments tab
echo 6. Click "Redeploy" on the latest deployment
echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your changes are now on GitHub.
echo Vercel will automatically deploy them.
echo.
echo Don't forget to:
echo 1. Add RESEND_API_KEY to Vercel
echo 2. Verify emails at https://resend.com/emails
echo.
pause
