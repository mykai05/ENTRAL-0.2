@echo off
setlocal

cd /d "%~dp0"
title ENTRAL Full Stack

set "NODE_EXE=C:\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

if not exist ".env" (
  echo Creating .env from .env.example...
  copy ".env.example" ".env" >nul
  echo.
)

echo ENTRAL full stack is starting.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:4000
echo.
echo The backend requires PostgreSQL on localhost:5432 and valid .env values.
echo If you only need the UI, close this window and run start-entral.cmd instead.
echo.

"%NODE_EXE%" .corepack\v1\pnpm\9.12.3\bin\pnpm.cjs --parallel --filter @entral/frontend --filter @entral/backend dev

echo.
echo ENTRAL full stack stopped.
pause
