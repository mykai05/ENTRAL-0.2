@echo off
setlocal

cd /d "%~dp0"
title ENTRAL Launcher

echo.
echo Starting ENTRAL...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wake-entral.ps1" -OpenBrowser

echo You can close this window. ENTRAL will keep running in the background.
pause
