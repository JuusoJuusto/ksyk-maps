# KSYK Maps - Cloudflare Tunnel Käynnistys
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KSYK Maps - Cloudflare Tunnel" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Käynnistetään Cloudflare Tunnel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Sovelluksesi tulee olemaan julkisesti saatavilla!" -ForegroundColor Green
Write-Host "Pidä tämä ikkuna auki pitääksesi tunnelin päällä." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start tunnel
cloudflared tunnel --url http://localhost:3000
