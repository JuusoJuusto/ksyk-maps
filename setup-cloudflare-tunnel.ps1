# KSYK Maps - Cloudflare Tunnel Setup Script
# Run this script to set up your public URL

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KSYK Maps - Cloudflare Tunnel Setup  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if cloudflared is installed
Write-Host "Step 1: Checking for cloudflared..." -ForegroundColor Yellow
try {
    $version = cloudflared --version
    Write-Host "✓ cloudflared is installed: $version" -ForegroundColor Green
} catch {
    Write-Host "✗ cloudflared is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installing cloudflared..." -ForegroundColor Yellow
    Write-Host "Please run this command in PowerShell as Administrator:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  winget install --id Cloudflare.cloudflared" -ForegroundColor Green
    Write-Host ""
    Write-Host "Or download from:" -ForegroundColor Cyan
    Write-Host "  https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/" -ForegroundColor Blue
    Write-Host ""
    Write-Host "After installation, run this script again!" -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "Step 2: Starting your KSYK Maps app..." -ForegroundColor Yellow
Write-Host "Make sure your app is running on port 3000" -ForegroundColor Cyan
Write-Host ""

# Step 3: Create tunnel
Write-Host "Step 3: Creating Cloudflare Tunnel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Your app will be accessible at a public URL!" -ForegroundColor Green
Write-Host ""
Write-Host "Starting tunnel..." -ForegroundColor Cyan
Write-Host ""

# Start the tunnel
cloudflared tunnel --url http://localhost:3000

# This will keep running and show you the URL
