@echo off
echo ========================================
echo   KSYK Maps - Quick Public URL Setup
echo ========================================
echo.
echo This will create a public URL for your KSYK Maps!
echo.
echo Step 1: Install Cloudflare Tunnel
echo ----------------------------------------
echo.
echo Please run this command in PowerShell as Administrator:
echo.
echo   winget install --id Cloudflare.cloudflared
echo.
echo Or download from:
echo   https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
echo.
echo.
echo Step 2: After installation, run:
echo ----------------------------------------
echo.
echo   cloudflared tunnel --url http://localhost:3000
echo.
echo.
echo Step 3: Share the URL!
echo ----------------------------------------
echo Cloudflare will give you a URL like:
echo   https://random-name.trycloudflare.com
echo.
echo Share this URL with anyone to access your KSYK Maps!
echo.
echo ========================================
echo.
pause
