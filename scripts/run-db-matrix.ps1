$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pgName = "yona-rust-pilot-pg"
$mysqlName = "yona-rust-pilot-mysql"
$mariaName = "yona-rust-pilot-mariadb"

function Wait-ForTcp {
  param(
    [string]$TargetHost,
    [int]$Port,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = [System.Net.Sockets.TcpClient]::new()
      $async = $client.BeginConnect($TargetHost, $Port, $null, $null)
      if ($async.AsyncWaitHandle.WaitOne(1000) -and $client.Connected) {
        $client.EndConnect($async)
        $client.Dispose()
        return
      }
      $client.Dispose()
    } catch {
    }
    Start-Sleep -Seconds 1
  }

  throw "Timed out waiting for ${TargetHost}:$Port"
}

try {
  docker rm -f $pgName $mysqlName $mariaName 2>$null | Out-Null

  docker run -d --name $pgName -e POSTGRES_PASSWORD=yona -e POSTGRES_USER=yona -e POSTGRES_DB=yona -p 55432:5432 postgres:16 | Out-Null
  docker run -d --name $mysqlName -e MYSQL_ROOT_PASSWORD=yona -e MYSQL_DATABASE=yona -e MYSQL_USER=yona -e MYSQL_PASSWORD=yona -p 53306:3306 mysql:8 | Out-Null
  docker run -d --name $mariaName -e MARIADB_ROOT_PASSWORD=yona -e MARIADB_DATABASE=yona -e MARIADB_USER=yona -e MARIADB_PASSWORD=yona -p 53307:3306 mariadb:11 | Out-Null

  Wait-ForTcp -TargetHost "127.0.0.1" -Port 55432
  Wait-ForTcp -TargetHost "127.0.0.1" -Port 53306
  Wait-ForTcp -TargetHost "127.0.0.1" -Port 53307

  $env:YONA_SPIKE_TEST_PG_URL = "postgres://yona:yona@127.0.0.1:55432/yona"
  $env:YONA_SPIKE_TEST_MYSQL_URL = "mysql://yona:yona@127.0.0.1:53306/yona"
  $env:YONA_SPIKE_TEST_MARIADB_URL = "mysql://yona:yona@127.0.0.1:53307/yona"

  Push-Location $root
  cargo test -p yona-rust-pilot-server --test db_matrix_env -- --nocapture
  if ($LASTEXITCODE -ne 0) {
    throw "db_matrix_env test failed with exit code $LASTEXITCODE"
  }
}
finally {
  Pop-Location
  docker rm -f $pgName $mysqlName $mariaName 2>$null | Out-Null
}
