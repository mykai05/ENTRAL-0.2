@echo off
setlocal

cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wake-entral.ps1" -OpenBrowser

if errorlevel 1 (
  echo.
  echo ENTRAL did not fully wake up. Check the artifacts folder for logs.
  pause
)
