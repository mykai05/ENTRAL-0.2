@echo off
setlocal

cd /d "%~dp0.."
set "NEXT_PUBLIC_API_URL=http://localhost:4000"
set "NEXT_TELEMETRY_DISABLED=1"

if not exist "artifacts" mkdir "artifacts"

cd /d "%~dp0..\frontend"

set "NODE_EXE=C:\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

"%NODE_EXE%" "..\.corepack\v1\pnpm\9.12.3\bin\pnpm.cjs" dev 1>"%~dp0..\artifacts\entral-frontend-task-out.log" 2>"%~dp0..\artifacts\entral-frontend-task-err.log"
