# One-shot repair script for the map-defaults locale bug.
#
# The Finnish-locale decimal-comma issue corrupted these fields by
# multiplying them by ~1e6. Auto-detects + divides back any field
# that's clearly out of range.

$headers = @{
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    "X-KSYK-Client" = "KSYK-Maps-Admin/1.0"
    "Accept" = "application/json"
    "Referer" = "https://ksykmaps.fi/admin"
}

Write-Host "Reading current map defaults..." -ForegroundColor Cyan
$current = Invoke-RestMethod -Uri "https://ksykmaps.fi/api/map-defaults" -Headers $headers
Write-Host "Current values:" -ForegroundColor Cyan
$current | Format-List

$body = @{}
foreach ($prop in $current.PSObject.Properties) {
    $key = $prop.Name
    $val = $prop.Value
    if ($key -in @("updatedAt", "id")) { continue }
    if ($val -is [int] -or $val -is [long] -or $val -is [double]) {
        $orig = [double]$val
        $fixed = $orig
        if ($key -like "*Lat*" -and ([Math]::Abs($orig) -gt 90)) {
            $fixed = $orig / 1000000
        } elseif ($key -like "*Lng*" -and ([Math]::Abs($orig) -gt 180)) {
            $fixed = $orig / 1000000
        } elseif ($key -like "*Bounds*" -and ([Math]::Abs($orig) -gt 1000)) {
            $fixed = $orig / 1000000
        }
        if ($fixed -ne $orig) {
            Write-Host ("  REPAIR  {0}: {1}  →  {2}" -f $key, $orig, $fixed) -ForegroundColor Yellow
        }
        $body[$key] = $fixed
    } else {
        $body[$key] = $val
    }
}

Write-Host ""
Write-Host "Sending repaired values..." -ForegroundColor Cyan
$payload = ($body | ConvertTo-Json -Compress)
Write-Host "  payload: $payload"
$response = Invoke-RestMethod -Uri "https://ksykmaps.fi/api/map-defaults" -Method PUT `
    -Headers $headers -ContentType "application/json" -Body $payload
Write-Host "Done. Server response:" -ForegroundColor Green
$response | Format-List
