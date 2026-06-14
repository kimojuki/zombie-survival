@echo off
title Zombie Survival — Redemarrer serveurs
call "%~dp0zs-server-env.bat"

if /i "%~1"=="--auth" set "ZS_START_AUTH=1"
if /i "%~1"=="--standalone" set "ZS_START_AUTH=1"

echo.
echo Redemarrage Zombie Survival...
echo.

call "%~dp0zs-server-stop.bat" silent

echo Attente 2 secondes...
timeout /t 2 /nobreak >nul
echo.

if "%ZS_START_AUTH%"=="1" (
  call "%~dp0zs-server-start.bat" --auth
) else (
  call "%~dp0zs-server-start.bat"
)
