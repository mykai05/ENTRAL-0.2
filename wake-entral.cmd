@echo off
setlocal

cd /d "%~dp0"
title Wake ENTRAL

echo.
echo Waking ENTRAL...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wake-entral.ps1" -OpenBrowser

echo.
echo You can close this window. ENTRAL will keep running in the background.
pause
