# KSYK Maps — native build script.
#
# Produces three real Windows .exe files using the C# compiler that
# ships built-in to Windows. No toolchain install required.
#
#   build\KSYK-Maps-Admin.exe   admin thick client
#   build\KSYK-Maps-Quick.exe   student utility
#   build\Setup.exe             wizard installer that embeds both

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { throw "C# compiler missing: $csc" }

if (-not (Test-Path build)) { New-Item -ItemType Directory -Path build | Out-Null }

# ── Step 1: build the icon ──────────────────────────────────────────────
# Convert favicon-*.png + icon-512.png into a single multi-resolution
# icon.ico. We use a tiny C# tool (MakeIcon.cs) so this stays toolchain-
# free; csc.exe is already present on every Windows.

$pubDir = Join-Path (Split-Path -Parent $PSScriptRoot) "public"
$pngList = @(
    "favicon-16.png", "favicon-32.png", "favicon-48.png",
    "favicon-64.png", "favicon-128.png", "icon-512.png"
) | ForEach-Object { Join-Path $pubDir $_ } | Where-Object { Test-Path $_ }

if ($pngList.Count -eq 0) {
    Write-Host "No KSYK logo PNGs found in $pubDir; skipping icon embed." -ForegroundColor Yellow
    $iconArg = $null
} else {
    Write-Host "Building icon.ico from $($pngList.Count) PNG(s)..." -ForegroundColor Cyan
    & $csc /nologo /target:exe /out:"build\MakeIcon.exe" `
        /reference:System.Drawing.dll src\MakeIcon.cs | Out-Null
    & "build\MakeIcon.exe" "build\icon.ico" @pngList
    if (-not (Test-Path "build\icon.ico")) {
        Write-Host "icon.ico not produced; will skip embedding." -ForegroundColor Yellow
        $iconArg = $null
    } else {
        $iconArg = "/win32icon:build\icon.ico"
    }
}

# ── Step 2: compile the two end-user apps ──────────────────────────────

Write-Host "Compiling KSYK-Maps-Admin..." -ForegroundColor Cyan
$cmd = @(
    "/nologo", "/target:winexe", "/out:build\KSYK-Maps-Admin.exe",
    "/reference:System.Windows.Forms.dll",
    "/reference:System.Drawing.dll",
    "/reference:System.Web.Extensions.dll",
    "/reference:System.Web.dll",
    "/reference:System.Device.dll",
    "src\Admin.cs"
)
if ($iconArg) { $cmd = @($iconArg) + $cmd }
& $csc @cmd | Out-Null

Write-Host "Compiling KSYK-Maps-Quick..." -ForegroundColor Cyan
$cmd = @(
    "/nologo", "/target:winexe", "/out:build\KSYK-Maps-Quick.exe",
    "/reference:System.Windows.Forms.dll",
    "/reference:System.Drawing.dll",
    "/reference:System.Web.Extensions.dll",
    "/reference:System.Xml.dll",
    "src\Quick.cs"
)
if ($iconArg) { $cmd = @($iconArg) + $cmd }
& $csc @cmd | Out-Null

# ── Step 3: compile Setup.exe with embedded resources ──────────────────

Write-Host "Compiling Setup..." -ForegroundColor Cyan
Push-Location build
$cmd = @(
    "/nologo", "/target:winexe", "/out:Setup.exe",
    "/resource:KSYK-Maps-Admin.exe,KSYK-Maps-Admin.exe",
    "/resource:KSYK-Maps-Quick.exe,KSYK-Maps-Quick.exe",
    "/reference:System.Windows.Forms.dll",
    "/reference:System.Drawing.dll",
    "/reference:Microsoft.CSharp.dll",
    "..\src\Setup.cs"
)
if ($iconArg -and (Test-Path "icon.ico")) { $cmd = @("/win32icon:icon.ico") + $cmd }
& $csc @cmd | Out-Null
Pop-Location

# ── Done ───────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "Built:" -ForegroundColor Green
Get-ChildItem -Path "build\*.exe" | Where-Object { $_.Name -ne "MakeIcon.exe" } | Sort-Object Name | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 1)
    Write-Host ("  {0}  ({1} KB)" -f $_.FullName, $size)
}
