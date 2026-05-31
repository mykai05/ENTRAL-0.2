$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackendDir = Join-Path $Root "backend"
$NodeExe = "C:\nodejs\node.exe"

if (-not (Test-Path $NodeExe)) {
  $NodeExe = (Get-Command node -ErrorAction Stop).Source
}

Set-Location $BackendDir
$env:API_HOST = "0.0.0.0"

$TsxCli = "node_modules\tsx\dist\cli.mjs"

if (Test-Path $TsxCli) {
  & $NodeExe "node_modules\tsx\dist\cli.mjs" "src\dev-memory-server.ts"
} elseif (Test-Path "dist\dev-memory-server.js") {
  & $NodeExe "dist\dev-memory-server.js"
} else {
  throw "Could not find tsx or dist\dev-memory-server.js for the memory backend."
}
