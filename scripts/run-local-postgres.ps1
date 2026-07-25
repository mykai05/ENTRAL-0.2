[CmdletBinding()]
param(
  [switch]$Stop,
  [ValidateRange(1, 65535)]
  [int]$Port
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $repoRoot ".local"
$postgresRoot = Join-Path $localRoot "postgres"
$dataRoot = Join-Path $localRoot "postgres-data"
$envFile = Join-Path $repoRoot ".env"
$pgCtl = Join-Path $postgresRoot "pgsql\bin\pg_ctl.exe"
$postgres = Join-Path $postgresRoot "pgsql\bin\postgres.exe"
$initDb = Join-Path $postgresRoot "pgsql\bin\initdb.exe"
$psql = Join-Path $postgresRoot "pgsql\bin\psql.exe"
$createdb = Join-Path $postgresRoot "pgsql\bin\createdb.exe"

if (-not (Test-Path -LiteralPath $envFile)) {
  throw "Entral .env is required to configure local PostgreSQL."
}

$databaseLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match "^DATABASE_URL=" } | Select-Object -First 1
if (-not $databaseLine) {
  throw "DATABASE_URL is required in Entral .env."
}

$databaseUri = [Uri]($databaseLine.Substring("DATABASE_URL=".Length))
if ([string]::IsNullOrWhiteSpace($databaseUri.UserInfo) -or $databaseUri.UserInfo -notmatch ":") {
  throw "DATABASE_URL must include local PostgreSQL credentials."
}

$databaseUser, $databasePassword = $databaseUri.UserInfo.Split(":", 2)
$databaseUser = [Uri]::UnescapeDataString($databaseUser)
$databasePassword = [Uri]::UnescapeDataString($databasePassword)
$configuredDatabasePort = if ($databaseUri.Port -gt 0) { $databaseUri.Port } else { 5432 }
$databasePort = if ($PSBoundParameters.ContainsKey("Port")) { $Port } else { $configuredDatabasePort }
$databaseName = [Uri]::UnescapeDataString($databaseUri.AbsolutePath.Trim("/"))
$databaseHost = if ($databaseUri.Host -eq "localhost") { "127.0.0.1" } else { $databaseUri.Host }

if (-not $databaseName) {
  throw "DATABASE_URL must include a database name."
}

if (-not (Test-Path -LiteralPath $pgCtl) -or -not (Test-Path -LiteralPath $postgres)) {
  throw "Portable PostgreSQL is not installed. Run the Entral setup command first."
}

if ($Stop) {
  & $pgCtl stop -D $dataRoot -m fast | Out-Host
  exit $LASTEXITCODE
}

New-Item -ItemType Directory -Force -Path $localRoot | Out-Null

if (-not (Test-Path -LiteralPath $dataRoot)) {
  $passwordFile = Join-Path $localRoot "postgres-password.tmp"
  try {
    [System.IO.File]::WriteAllText($passwordFile, "$databasePassword`n", [System.Text.UTF8Encoding]::new($false))
    & $initDb -D $dataRoot -U $databaseUser "--pwfile=$passwordFile" | Out-Host
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } finally {
    if (Test-Path -LiteralPath $passwordFile) {
      Remove-Item -LiteralPath $passwordFile -Force
    }
  }
}

$postmasterPid = Join-Path $dataRoot "postmaster.pid"
& $pgCtl status -D $dataRoot *> $null
$projectDatabaseIsRunning = $LASTEXITCODE -eq 0

if ($projectDatabaseIsRunning) {
  $postmasterState = Get-Content -LiteralPath $postmasterPid -ErrorAction Stop
  $runningPort = if ($postmasterState.Count -ge 4) { [int]$postmasterState[3] } else { 0 }

  if ($runningPort -ne $databasePort) {
    throw "ENTRAL portable PostgreSQL is already running on port $runningPort. Re-run with -Port $runningPort and start the backend with the matching DATABASE_URL port."
  }
} else {
  $existingListener = Get-NetTCPConnection -LocalPort $databasePort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($existingListener) {
    throw "Port $databasePort is already in use by process $($existingListener.OwningProcess); ENTRAL portable PostgreSQL was not started. Choose a free port with -Port."
  }

  $postgresArguments = "-D `"$dataRoot`" -h 127.0.0.1 -p $databasePort"
  $postgresProcess = Start-Process -FilePath $postgres -ArgumentList $postgresArguments -PassThru -WindowStyle Hidden

  $ready = $false
  for ($attempt = 0; $attempt -lt 120; $attempt += 1) {
    Start-Sleep -Milliseconds 250
    & $pgCtl status -D $dataRoot *> $null
    if ($LASTEXITCODE -eq 0) {
      $ready = $true
      break
    }

    if ($postgresProcess.HasExited) {
      break
    }
  }

  if (-not $ready) {
    throw "ENTRAL portable PostgreSQL did not start on 127.0.0.1:$databasePort. Check the data-directory log and verify the port is free."
  }
}

$env:PGPASSWORD = $databasePassword
try {
  $exists = & $psql -h $databaseHost -p $databasePort -U $databaseUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$($databaseName.Replace("'", "''"))'" 2>$null
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  if ($exists.Trim() -ne "1") {
    & $createdb -h $databaseHost -p $databasePort -U $databaseUser $databaseName | Out-Host
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Output "Local PostgreSQL is ready for $databaseHost`:$databasePort/$databaseName."
