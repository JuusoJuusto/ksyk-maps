# Smoke-test the silent install/uninstall path.
#
# Runs `Setup.exe /silent`, verifies install dir + shortcuts + uninstall
# registry key are in place, then runs Uninstall.exe /silent and verifies
# everything is removed.

$ErrorActionPreference = "Continue"
$installDir = "$env:LOCALAPPDATA\Programs\KSYK Maps"
$regKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\KSYKMaps"
$startMenu = "$([Environment]::GetFolderPath('StartMenu'))\Programs\KSYK Maps"
$desktop = [Environment]::GetFolderPath('DesktopDirectory')

# Pre-flight: clean any previous install
if (Test-Path $installDir) { Remove-Item -Recurse -Force $installDir }
Remove-Item $regKey -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path $startMenu) { Remove-Item -Recurse -Force $startMenu }
Remove-Item "$desktop\KSYK Maps.lnk" -ErrorAction SilentlyContinue

Write-Host "Running Setup.exe /silent..." -ForegroundColor Cyan
$setup = "$PSScriptRoot\build\Setup.exe"
$p = Start-Process -FilePath $setup -ArgumentList "/silent" -Wait -PassThru
Write-Host ("Setup exit code: {0}" -f $p.ExitCode)

# Verify install
Write-Host ""
Write-Host "Verifying install..." -ForegroundColor Cyan
$results = @()
$results += @{ Name = "Install dir";          Pass = (Test-Path $installDir) }
$results += @{ Name = "Admin.exe in dir";     Pass = (Test-Path "$installDir\KSYK-Maps-Admin.exe") }
$results += @{ Name = "Quick.exe in dir";     Pass = (Test-Path "$installDir\KSYK-Maps-Quick.exe") }
$results += @{ Name = "Uninstall.exe in dir"; Pass = (Test-Path "$installDir\Uninstall.exe") }
$results += @{ Name = "Start menu folder";    Pass = (Test-Path $startMenu) }
$results += @{ Name = "Admin shortcut";       Pass = (Test-Path "$startMenu\KSYK Maps Admin.lnk") }
$results += @{ Name = "Quick shortcut";       Pass = (Test-Path "$startMenu\KSYK Maps.lnk") }
$results += @{ Name = "Uninstall shortcut";   Pass = (Test-Path "$startMenu\Uninstall KSYK Maps.lnk") }
$results += @{ Name = "Reg uninstall key";    Pass = (Test-Path $regKey) }
$results += @{ Name = "Desktop shortcut";     Pass = (Test-Path "$desktop\KSYK Maps.lnk") }

foreach ($r in $results) {
    $sym = if ($r.Pass) { "OK" } else { "FAIL" }
    $col = if ($r.Pass) { "Green" } else { "Red" }
    Write-Host ("  [{0,4}] {1}" -f $sym, $r.Name) -ForegroundColor $col
}

$failed = $results | Where-Object { -not $_.Pass }
if ($failed) {
    Write-Host "Install FAILED" -ForegroundColor Red
    exit 1
}
Write-Host "Install PASSED" -ForegroundColor Green

# Verify the installed exes actually run
Write-Host ""
Write-Host "Smoke-testing installed exes..." -ForegroundColor Cyan
foreach ($exe in @("KSYK-Maps-Admin.exe", "KSYK-Maps-Quick.exe")) {
    $pp = Start-Process -FilePath "$installDir\$exe" -PassThru
    Start-Sleep -Seconds 2
    if ($pp.HasExited) {
        Write-Host ("  [FAIL] {0} exited with {1}" -f $exe, $pp.ExitCode) -ForegroundColor Red
    } else {
        Write-Host ("  [OK]   {0} running (pid {1})" -f $exe, $pp.Id) -ForegroundColor Green
        Stop-Process -Id $pp.Id -Force
    }
}

# Now uninstall
Write-Host ""
Write-Host "Running Uninstall.exe /silent..." -ForegroundColor Cyan
$un = Start-Process -FilePath "$installDir\Uninstall.exe" -ArgumentList "/uninstall","/silent" -Wait -PassThru
Write-Host ("Uninstall exit code: {0}" -f $un.ExitCode)
Start-Sleep -Seconds 3  # give the deferred self-delete batch time

Write-Host ""
Write-Host "Verifying uninstall..." -ForegroundColor Cyan
$results = @()
$results += @{ Name = "Install dir removed";  Pass = -not (Test-Path $installDir) }
$results += @{ Name = "Start menu removed";   Pass = -not (Test-Path $startMenu) }
$results += @{ Name = "Reg key removed";      Pass = -not (Test-Path $regKey) }
$results += @{ Name = "Desktop shortcut gone"; Pass = -not (Test-Path "$desktop\KSYK Maps.lnk") }
foreach ($r in $results) {
    $sym = if ($r.Pass) { "OK" } else { "FAIL" }
    $col = if ($r.Pass) { "Green" } else { "Red" }
    Write-Host ("  [{0,4}] {1}" -f $sym, $r.Name) -ForegroundColor $col
}
$failed = $results | Where-Object { -not $_.Pass }
if ($failed) {
    Write-Host "Uninstall FAILED" -ForegroundColor Red
    exit 1
}
Write-Host "Uninstall PASSED" -ForegroundColor Green
