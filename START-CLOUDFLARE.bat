@echo off
echo ========================================
echo   KSYK Maps - Cloudflare Tunnel
echo ========================================
echo.
echo Starting Cloudflare Tunnel...
echo.
echo Your app will be accessible at a public URL!
echo Keep this window open to keep the tunnel running.
echo.
echo ========================================
echo.

cloudflared tunnel --url http://localhost:3000

pause
