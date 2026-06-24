$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot "frontend"
$frontendDist = Join-Path $frontendDir "dist"
$binaryPath = Join-Path $repoRoot "target\debug\yoram.exe"

Push-Location $repoRoot
try {
  pnpm --dir frontend build
  if ($LASTEXITCODE -ne 0) {
    throw "frontend build failed with exit code $LASTEXITCODE"
  }

  $env:YONA_EMBED_ASSET_ROOT = $frontendDist
  cargo build -p yoram-server --bin yoram
  if ($LASTEXITCODE -ne 0) {
    throw "cargo build failed with exit code $LASTEXITCODE"
  }

  $env:YONA_BASE_PATH = "/yona"
  $env:YONA_USE_EMBEDDED_ASSETS = "1"
  $env:YONA_SEED_PILOT = "1"

  $proc = Start-Process -FilePath $binaryPath -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru

  try {
    Start-Sleep -Seconds 3

    $index = Invoke-WebRequest -Uri "http://127.0.0.1:8089/yona/" -UseBasicParsing
    $projects = Invoke-WebRequest -Uri "http://127.0.0.1:8089/yona/projects" -UseBasicParsing
    $assetPath = [regex]::Match($index.Content, 'src=\"(?<path>(?:\./|/(?:yona/)?)?assets/[^\"]+)\"').Groups["path"].Value
    if ([string]::IsNullOrWhiteSpace($assetPath)) {
      throw "Failed to discover embedded asset path from index.html"
    }
    $stylesheetPath = [regex]::Match($index.Content, 'href=\"(?<path>(?:\./|/(?:yona/)?)?assets/[^\"]+\.css)\"').Groups["path"].Value
    if ([string]::IsNullOrWhiteSpace($stylesheetPath)) {
      throw "Failed to discover embedded stylesheet path from index.html"
    }
    if ($assetPath.StartsWith("/yona/")) {
      $assetUri = "http://127.0.0.1:8089" + $assetPath
    }
    elseif ($assetPath.StartsWith("/")) {
      $assetUri = "http://127.0.0.1:8089/yona" + $assetPath
    }
    else {
      $assetUri = "http://127.0.0.1:8089/yona/" + $assetPath.TrimStart('.')
    }
    if ($stylesheetPath.StartsWith("/yona/")) {
      $stylesheetUri = "http://127.0.0.1:8089" + $stylesheetPath
    }
    elseif ($stylesheetPath.StartsWith("/")) {
      $stylesheetUri = "http://127.0.0.1:8089/yona" + $stylesheetPath
    }
    else {
      $stylesheetUri = "http://127.0.0.1:8089/yona/" + $stylesheetPath.TrimStart('.')
    }
    $asset = Invoke-WebRequest -Uri $assetUri -UseBasicParsing
    $stylesheet = Invoke-WebRequest -Uri $stylesheetUri -UseBasicParsing
    if (-not ([string]$stylesheet.Headers["Content-Type"]).StartsWith("text/css")) {
      throw "Stylesheet response is not text/css: $($stylesheet.Headers["Content-Type"])"
    }
    $session = Invoke-WebRequest -Uri "http://127.0.0.1:8089/yona/api/auth/session" -UseBasicParsing
    $restProjects = Invoke-WebRequest -Uri "http://127.0.0.1:8089/yona/api/v1/projects" -UseBasicParsing

    [pscustomobject]@{
      index_status = $index.StatusCode
      index_runtime_config = ($index.Content -match "__YONA_RUNTIME_CONFIG__")
      projects_status = $projects.StatusCode
      asset_uri = $assetUri
      asset_status = $asset.StatusCode
      asset_non_empty = ($asset.Content.Length -gt 0)
      stylesheet_uri = $stylesheetUri
      stylesheet_status = $stylesheet.StatusCode
      stylesheet_content_type = $stylesheet.Headers["Content-Type"]
      stylesheet_non_empty = ($stylesheet.Content.Length -gt 0)
      session_status = $session.StatusCode
      session_has_csrf = [bool]$session.Headers["X-CSRF-Token"]
      rest_projects_status = $restProjects.StatusCode
      rest_projects_has_project = ($restProjects.Content -match '"projectName":"yona"')
    } | ConvertTo-Json -Compress
  }
  finally {
    if ($null -ne $proc -and -not $proc.HasExited) {
      Stop-Process -Id $proc.Id -Force
    }
  }
}
finally {
  Remove-Item Env:\YONA_EMBED_ASSET_ROOT -ErrorAction SilentlyContinue
  Remove-Item Env:\YONA_BASE_PATH -ErrorAction SilentlyContinue
  Remove-Item Env:\YONA_USE_EMBEDDED_ASSETS -ErrorAction SilentlyContinue
  Remove-Item Env:\YONA_SEED_PILOT -ErrorAction SilentlyContinue
  Pop-Location
}
