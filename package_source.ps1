$ErrorActionPreference = "Stop"
$projectName = "GifBuilder"
$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$zipName = "${projectName}_Source_${timestamp}.zip"
$sourceDir = Get-Location
$tempDir = Join-Path $env:TEMP "${projectName}_${timestamp}"
$destDir = Join-Path $sourceDir "versions"
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}
$destZip = Join-Path $destDir $zipName

Write-Host "Packaging project..."
Write-Host "Source: $sourceDir"
Write-Host "Temp: $tempDir"
Write-Host "Destination: $destZip"

# Create temp dir
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Use Robocopy to copy files while excluding unwanted directories
# /E : Copy subdirectories, including Empty ones.
# /XD : Exclude Directories matching given names/paths.
# /XF : Exclude Files matching given names/paths.
# /NFL : No File List - don't log file names.
# /NDL : No Directory List - don't log directory names.
# /NJH : No Job Header.
# /NJS : No Job Summary.
$robocopyArgs = @(
    "$sourceDir",
    "$tempDir",
    "/E",
    "/XD", "node_modules", "dist", ".git", ".vscode", ".idea", "coverage",
    "/XF", "*.zip", "*.log", ".DS_Store"
)

Write-Host "Copying files (excluding node_modules, dist, .git)..."
# Robocopy exit codes 0-7 are success.
$p = Start-Process robocopy -ArgumentList $robocopyArgs -NoNewWindow -Wait -PassThru
if ($p.ExitCode -gt 7) {
    Write-Error "Robocopy failed with exit code $($p.ExitCode)"
}

Write-Host "Compressing files..."
Compress-Archive -Path "$tempDir\*" -DestinationPath $destZip -Force

Write-Host "Cleaning up..."
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Done! Project packaged to: $zipName"
