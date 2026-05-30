param(
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Artifacts = Join-Path $Root "artifacts"
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$FrontendUrl = "http://localhost:3000"
$FrontendReadyUrl = "$FrontendUrl/login"
$BackendHealthUrl = "http://localhost:4000/health"

New-Item -ItemType Directory -Force -Path $Artifacts | Out-Null

$env:NEXT_TELEMETRY_DISABLED = "1"
$env:NEXT_PUBLIC_API_URL = "http://localhost:4000"
$env:API_HOST = "0.0.0.0"

function Repair-ProcessPath {
  $pathValue = [Environment]::GetEnvironmentVariable("Path", "Process")
  if (-not $pathValue) {
    $pathValue = [Environment]::GetEnvironmentVariable("PATH", "Process")
  }

  # Windows can expose both Path and PATH to child process launchers. Normalize
  # to one key so Start-Process does not fail with a duplicate environment key.
  [Environment]::SetEnvironmentVariable("PATH", $null, "Process")
  if ($pathValue) {
    [Environment]::SetEnvironmentVariable("Path", $pathValue, "Process")
  }
}

function Get-NodeExe {
  $bundledNode = "C:\nodejs\node.exe"
  if (Test-Path $bundledNode) {
    return $bundledNode
  }

  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    return $node.Source
  }

  throw "Node.js was not found. Install Node.js or add it to PATH, then run this launcher again."
}

function Test-Endpoint {
  param(
    [string]$Url,
    [int]$TimeoutSec = 4
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSec
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Wait-Endpoint {
  param(
    [string]$Url,
    [int]$Seconds = 45
  )

  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Endpoint -Url $Url -TimeoutSec 3) {
      return $true
    }
    Start-Sleep -Milliseconds 750
  }

  return $false
}

function Stop-EntralPort {
  param(
    [int]$Port
  )

  $listeners = netstat -ano |
    Select-String ":$Port\s" |
    Where-Object { $_ -match "\sLISTENING\s+(\d+)$" }

  foreach ($listener in $listeners) {
    if (-not ($listener.Line -match "\sLISTENING\s+(\d+)$")) {
      continue
    }

    $pidValue = [int]$Matches[1]
    $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue

    if ($process -and $process.ProcessName -eq "node") {
      Stop-Process -Id $pidValue -Force
      Write-Host "Cleared stale ENTRAL process on port $Port (PID $pidValue)."
    }
  }
}

function Start-EntralProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string[]]$Arguments
  )

  $nodeExe = Get-NodeExe
  $stdout = Join-Path $Artifacts "entral-$Name-wake-out.log"
  $stderr = Join-Path $Artifacts "entral-$Name-wake-err.log"

  $process = Start-Process `
    -FilePath $nodeExe `
    -ArgumentList $Arguments `
    -WorkingDirectory $WorkingDirectory `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -WindowStyle Hidden `
    -PassThru

  Write-Host "Started ENTRAL $Name process (PID $($process.Id))."
}

Repair-ProcessPath

$backendReady = Test-Endpoint $BackendHealthUrl
$frontendReady = Test-Endpoint $FrontendReadyUrl

if (-not $backendReady) {
  Stop-EntralPort 4000
  $stdout = Join-Path $Artifacts "entral-backend-wake-out.log"
  $stderr = Join-Path $Artifacts "entral-backend-wake-err.log"
  $backendRunner = Join-Path $Root "scripts\run-memory-backend.ps1"
  $process = Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$backendRunner`"" `
    -WorkingDirectory $Root `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -WindowStyle Hidden `
    -PassThru

  Write-Host "Started ENTRAL backend process (PID $($process.Id))."
} else {
  Write-Host "ENTRAL backend is already awake."
}

if (-not $frontendReady) {
  Stop-EntralPort 3000
  $frontendRunner = Join-Path $Root "scripts\run-frontend-dev.cmd"
  $stdout = Join-Path $Artifacts "entral-frontend-wake-out.log"
  $stderr = Join-Path $Artifacts "entral-frontend-wake-err.log"
  $process = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList "/c `"$frontendRunner`"" `
    -WorkingDirectory $Root `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -WindowStyle Hidden `
    -PassThru

  Write-Host "Started ENTRAL frontend process (PID $($process.Id))."
} else {
  Write-Host "ENTRAL frontend is already awake."
}

$backendReady = Wait-Endpoint $BackendHealthUrl 45
$frontendReady = Wait-Endpoint $FrontendReadyUrl 60

if ($backendReady -and $frontendReady) {
  Write-Host ""
  Write-Host "ENTRAL is awake."
  Write-Host "Frontend: $FrontendUrl"
  Write-Host "Backend:  $BackendHealthUrl"

  if ($OpenBrowser) {
    Start-Process $FrontendUrl
  }

  exit 0
}

Write-Host ""
Write-Host "ENTRAL did not fully wake up."
Write-Host "Backend ready:  $backendReady"
Write-Host "Frontend ready: $frontendReady"
Write-Host "Logs are in: $Artifacts"
exit 1
