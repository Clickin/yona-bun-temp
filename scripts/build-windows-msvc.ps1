param(
  [string]$Target = "x86_64-pc-windows-msvc",
  [string]$Features = "db-matrix",
  [ValidateSet("debug", "release")]
  [string]$Profile = "release",
  [switch]$SkipFrontend,
  [switch]$NoArchive
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot "frontend"
$frontendDist = Join-Path $frontendDir "dist"
$profileDir = if ($Profile -eq "release") { "release" } else { "debug" }
$artifactDir = Join-Path $repoRoot "dist\windows-msvc-$Target"
$binaryPath = Join-Path $repoRoot "target\$Target\$profileDir\yoram.exe"
$artifactBinary = Join-Path $artifactDir "yoram.exe"
$sampleConfigPath = Join-Path $artifactDir "yoram.toml"

function Invoke-Step {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Host "==> $Label"
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

Push-Location $repoRoot
try {
  if (-not $SkipFrontend) {
    Invoke-Step "Build frontend assets" { pnpm --dir frontend build }
  }

  if (-not (Test-Path $frontendDist)) {
    throw "frontend dist not found: $frontendDist. Run without -SkipFrontend first."
  }

  Invoke-Step "Install Rust target $Target if needed" { rustup target add $Target }

  $env:YONA_EMBED_ASSET_ROOT = $frontendDist

  $cargoArgs = @("build", "-p", "yoram-server", "--bin", "yoram", "--target", $Target)
  if ($Profile -eq "release") {
    $cargoArgs += "--release"
  }
  if (-not [string]::IsNullOrWhiteSpace($Features) -and $Features -ne "none") {
    $cargoArgs += @("--features", $Features)
  }

  Invoke-Step "Build yoram.exe ($Target, $Profile)" { cargo @cargoArgs }

  if (-not (Test-Path $binaryPath)) {
    throw "binary not found after build: $binaryPath"
  }

  New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
  Copy-Item -Force $binaryPath $artifactBinary

@"
schema_policy = "up"
use_embedded_assets = true
base_path = "/"

[site]
name = "Yoram"
allow_anonymous_access = true

[database]
url = "sqlite://yoram.db?mode=rwc"

[auth]
signup_require_confirm = false
"@ | Set-Content -Encoding UTF8 $sampleConfigPath

  if (-not $NoArchive) {
    $archivePath = Join-Path $repoRoot "dist\yoram-windows-msvc-$Target.zip"
    if (Test-Path $archivePath) {
      Remove-Item $archivePath
    }
    Compress-Archive -Path (Join-Path $artifactDir "*") -DestinationPath $archivePath
    Write-Host "archive: $archivePath"
  }

  Write-Host "binary : $artifactBinary"
  Write-Host "config : $sampleConfigPath"
}
finally {
  Remove-Item Env:\YONA_EMBED_ASSET_ROOT -ErrorAction SilentlyContinue
  Pop-Location
}
