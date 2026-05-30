$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackendDir = Join-Path $Root "backend"
$NodeExe = "C:\nodejs\node.exe"

if (-not (Test-Path $NodeExe)) {
  $NodeExe = (Get-Command node -ErrorAction Stop).Source
}

Set-Location $BackendDir
$env:API_HOST = "0.0.0.0"

if (Test-Path "dist\dev-memory-server.js") {
  & $NodeExe "dist\dev-memory-server.js"
} else {
  & $NodeExe "node_modules\tsx\dist\cli.mjs" "src\dev-memory-server.ts"
}
