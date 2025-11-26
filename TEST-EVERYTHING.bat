@echo off
echo ========================================
echo TESTING YOUR SETUP
echo ========================================
echo.

echo [1/5] Checking .env file...
findstr "RESEND_API_KEY" .env
if %errorlevel% equ 0 (
    echo ✓ RESEND_API_KEY found in .env
) else (
    echo ✗ RESEND_API_KEY NOT found in .env
    echo Please add: RESEND_API_KEY=re_cjxCHufh_6dt8g21HwgeMNLvn81wbdcMC
)
echo.

echo [2/5] Checking AppSettingsManager component...
if exist "client\src\components\AppSettingsManager.tsx" (
    echo ✓ AppSettingsManager.tsx exists
) else (
    echo ✗ AppSettingsManager.tsx NOT found
)
echo.

echo [3/5] Checking AdminDashboard has Settings tab...
findstr "TabsTrigger value=\"settings\"" client\src\components\AdminDashboard.tsx >nul
if %errorlevel% equ 0 (
    echo ✓ Settings tab found in AdminDashboard
) else (
    echo ✗ Settings tab NOT found in AdminDashboard
)
echo.

echo [4/5] Checking AdminDashboard imports AppSettingsManager...
findstr "AppSettingsManager" client\src\components\AdminDashboard.tsx >nul
if %errorlevel% equ 0 (
    echo ✓ AppSettingsManager imported in AdminDashboard
) else (
    echo ✗ AppSettingsManager NOT imported
)
echo.

echo [5/5] Checking email service...
if exist "server\emailService.ts" (
    echo ✓ emailService.ts exists
    findstr "Resend" server\emailService.ts >nul
    if %errorlevel% equ 0 (
        echo ✓ Using Resend SDK
    ) else (
        echo ✗ Not using Resend SDK
    )
) else (
    echo ✗ emailService.ts NOT found
)
echo.

echo ========================================
echo SUMMARY
echo ========================================
echo.
echo If all checks passed (✓), your setup is correct!
echo.
echo NEXT STEPS:
echo 1. Go to https://resend.com/login
echo 2. Verify email addresses you want to send to
echo 3. Restart your server: npm run dev
echo 4. Login to admin panel
echo 5. Look for Settings tab (7th tab)
echo 6. Test email by creating a user
echo.
echo ========================================
pause
