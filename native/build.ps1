# KSYK Maps — native app builder.
#
# Produces two single-file Windows .exe applications using PyInstaller.
# Run from anywhere; the script cds into its own directory.
#
# Outputs:
#   dist/KSYK-Maps-Admin.exe   — admin tool (rooms, tickets, analytics, WiFi)
#   dist/KSYK-Maps-Quick.exe   — student utility (room finder, lunch, news)
#
# Requirements (one-time):
#   python -m pip install --user pyinstaller requests

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$pyScripts = "$env:USERPROFILE\AppData\Roaming\Python\Python311\Scripts"
if (Test-Path $pyScripts) {
    $env:PATH = "$pyScripts;$env:PATH"
}

if (-not (Get-Command pyinstaller -ErrorAction SilentlyContinue)) {
    Write-Host "PyInstaller not found. Installing..." -ForegroundColor Yellow
    python -m pip install --user pyinstaller
}

Write-Host "Building KSYK-Maps-Admin.exe..." -ForegroundColor Cyan
pyinstaller --onefile --noconsole --name "KSYK-Maps-Admin" --clean ksyk_admin.py

Write-Host "Building KSYK-Maps-Quick.exe..." -ForegroundColor Cyan
pyinstaller --onefile --noconsole --name "KSYK-Maps-Quick" --clean ksyk_viewer.py

Write-Host ""
Write-Host "Done. Outputs:" -ForegroundColor Green
Get-ChildItem -Path "dist\*.exe" | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 1)
    Write-Host "  $($_.FullName)  ($size MB)"
}
