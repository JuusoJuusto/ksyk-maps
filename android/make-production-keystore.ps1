# make-production-keystore.ps1 — v4.7.19
#
# One-shot Play Store keystore generator + env-var line printer.
#
# What this does:
#   1. Prompts you for a keystore password (twice, must match).
#   2. Prompts you for a key alias password (twice, must match).
#   3. Runs keytool to generate a 4096-bit RSA key valid for 68 years.
#   4. Prints the exact PowerShell lines you paste to build a signed
#      release Bundle for the Play Store.
#
# What it does NOT do:
#   - It does NOT upload anything.
#   - It does NOT commit the keystore to git (path is outside repo).
#   - It does NOT store the passwords anywhere on disk.
#
# CRITICAL: Losing this keystore means you can NEVER publish an update
# to the same Play listing. Back it up somewhere you'll still find in
# 5 years. Options: password manager, encrypted USB, second machine.
#
# Usage:
#   cd android
#   .\make-production-keystore.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "KSYK Maps — Production keystore generator" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# --- Prerequisites check ---------------------------------------------------
$javaHome = $env:JAVA_HOME
if (-not (Get-Command keytool -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: keytool not found on PATH." -ForegroundColor Red
    Write-Host "Install JDK 17: winget install Microsoft.OpenJDK.17" -ForegroundColor Yellow
    Write-Host "Or open a shell where Android Studio's JDK is on PATH." -ForegroundColor Yellow
    exit 1
}

# --- Output location -------------------------------------------------------
$defaultDir = "$env:USERPROFILE\ksyk-keystore"
Write-Host "Where should the keystore file live?"
Write-Host "  Default: $defaultDir\ksyk-production.jks"
Write-Host "  (Anywhere OUTSIDE the git repo — do NOT put it under KSYK-Map\)"
$dir = Read-Host "  Press Enter for default, or type an absolute path"
if (-not $dir) { $dir = $defaultDir }
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$ksPath = Join-Path $dir "ksyk-production.jks"

if (Test-Path $ksPath) {
    Write-Host ""
    Write-Host "ERROR: A keystore already exists at $ksPath." -ForegroundColor Red
    Write-Host "Refusing to overwrite. Move or rename the existing file first." -ForegroundColor Red
    exit 1
}

# --- Password entry (never printed, never logged) --------------------------
Write-Host ""
Write-Host "Keystore password (min 6 chars — write it down BEFORE typing):"
$storePw1 = Read-Host -AsSecureString
$storePw2 = Read-Host -AsSecureString -Prompt "  Confirm keystore password"
$sp1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePw1))
$sp2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePw2))
if ($sp1 -ne $sp2) {
    Write-Host "ERROR: Keystore passwords don't match." -ForegroundColor Red
    exit 1
}
if ($sp1.Length -lt 6) {
    Write-Host "ERROR: Keystore password must be at least 6 characters." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Key password (can be same as keystore; Play recommends same):"
$keyPw1 = Read-Host -AsSecureString
$keyPw2 = Read-Host -AsSecureString -Prompt "  Confirm key password"
$kp1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPw1))
$kp2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPw2))
if ($kp1 -ne $kp2) {
    Write-Host "ERROR: Key passwords don't match." -ForegroundColor Red
    exit 1
}

# --- Generate --------------------------------------------------------------
Write-Host ""
Write-Host "Generating keystore… (this takes ~5 seconds)"
$dname = "CN=KSYK Maps, O=Kulosaaren yhteiskoulu, L=Helsinki, C=FI"

& keytool -genkeypair -v `
    -keystore $ksPath `
    -alias ksyk `
    -keyalg RSA -keysize 4096 -validity 25000 `
    -storepass $sp1 -keypass $kp1 `
    -dname $dname

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: keytool failed (exit $LASTEXITCODE)." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Keystore created: $ksPath" -ForegroundColor Green
Write-Host ""

# --- Fingerprint printout so you can register with Google Play -------------
Write-Host "SHA-1 + SHA-256 fingerprints (Play Console → App integrity needs these):" -ForegroundColor Cyan
& keytool -list -v -keystore $ksPath -alias ksyk -storepass $sp1 |
    Select-String -Pattern 'SHA1:|SHA256:|Owner:|Valid'
Write-Host ""

# --- Env-var lines to paste -----------------------------------------------
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  BACK UP THE KEYSTORE FILE NOW, THEN COPY-PASTE THESE:" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  `$env:KSYK_KEYSTORE_FILE     = `"$ksPath`""
Write-Host "  `$env:KSYK_KEYSTORE_PASSWORD = `"<the keystore password you just chose>`""
Write-Host "  `$env:KSYK_KEY_ALIAS         = `"ksyk`""
Write-Host "  `$env:KSYK_KEY_PASSWORD      = `"<the key password you just chose>`""
Write-Host "  .\gradlew bundleRelease"
Write-Host ""
Write-Host "  Upload to Play:"
Write-Host "    app\build\outputs\bundle\release\app-release.aab" -ForegroundColor Green
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  BACKUP CHECKLIST — do all three, do NOT skip:" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  [ ] Copy $ksPath to a password manager attachment"
Write-Host "  [ ] Copy the same file to an encrypted USB drive"
Write-Host "  [ ] Save both passwords in the same password manager entry"
Write-Host ""
Write-Host "If you lose the keystore, you cannot publish updates. Ever."
Write-Host ""
