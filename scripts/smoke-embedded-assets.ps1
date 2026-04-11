$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent (Split-Path -Parent $root)
$frontendDir = Join-Path $repoRoot "frontend"
$frontendDist = Join-Path $frontendDir "dist"
$binaryPath = Join-Path $root "target\debug\yona-rust-pilot-server.exe"

Push-Location $repoRoot
try {
  pnpm --dir frontend build
  if ($LASTEXITCODE -ne 0) {
    throw "frontend build failed with exit code $LASTEXITCODE"
  }

  Push-Location $root
  $env:YONA_EMBED_ASSET_ROOT = $frontendDist
  cargo build -p yona-rust-pilot-server
  if ($LASTEXITCODE -ne 0) {
    throw "cargo build failed with exit code $LASTEXITCODE"
  }

  $env:YONA_BASE_PATH = "/yona"
  $env:YONA_USE_EMBEDDED_ASSETS = "1"
  $env:YONA_SEED_PILOT = "1"

  $proc = Start-Process -FilePath $binaryPath -WorkingDirectory $root -PassThru

  try {
    Start-Sleep -Seconds 3

    $index = Invoke-WebRequest -Uri "http://127.0.0.1:8089/yona/" -UseBasicParsing
    $projects = Invoke-WebRequest -Uri "http://127.0.0.1:8089/yona/projects" -UseBasicParsing
    $assetPath = [regex]::Match($index.Content, 'src=\"(?<path>\./assets/[^\"]+)\"').Groups["path"].Value
    if ([string]::IsNullOrWhiteSpace($assetPath)) {
      throw "Failed to discover embedded asset path from index.html"
    }
    $assetUri = "http://127.0.0.1:8089/yona/" + $assetPath.TrimStart('.')
    $asset = Invoke-WebRequest -Uri $assetUri -UseBasicParsing
    $session = Invoke-WebRequest -Uri "http://127.0.0.1:8089/yona/api/auth/session" -UseBasicParsing
    $rpc = Invoke-WebRequest -Method POST -Uri "http://127.0.0.1:8089/yona/rpc/yona.pilot.v1.PilotService/ListProjects" -ContentType "application/json" -Body "{}"

    [pscustomobject]@{
      index_status = $index.StatusCode
      index_runtime_config = ($index.Content -match "__YONA_RUNTIME_CONFIG__")
      projects_status = $projects.StatusCode
      asset_uri = $assetUri
      asset_status = $asset.StatusCode
      asset_non_empty = ($asset.Content.Length -gt 0)
      session_status = $session.StatusCode
      session_has_csrf = [bool]$session.Headers["X-CSRF-Token"]
      rpc_status = $rpc.StatusCode
      rpc_has_project = ($rpc.Content -match '"projectName":"yona"')
    } | ConvertTo-Json -Compress
  }
  finally {
    if ($null -ne $proc -and -not $proc.HasExited) {
      Stop-Process -Id $proc.Id -Force
    }
    Pop-Location
  }
}
finally {
  Remove-Item Env:\YONA_EMBED_ASSET_ROOT -ErrorAction SilentlyContinue
  Remove-Item Env:\YONA_BASE_PATH -ErrorAction SilentlyContinue
  Remove-Item Env:\YONA_USE_EMBEDDED_ASSETS -ErrorAction SilentlyContinue
  Remove-Item Env:\YONA_SEED_PILOT -ErrorAction SilentlyContinue
  Pop-Location
}
