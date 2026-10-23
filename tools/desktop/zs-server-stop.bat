@echo off
title Zombie Survival — Arret serveurs
call "%~dp0zs-server-env.bat"

echo.
echo Arret des serveurs (game %ZS_PORT_GAME%, vite %ZS_PORT_VITE%, auth %ZS_PORT_AUTH%)...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0zs-kill-ports.ps1" -Ports %ZS_PORT_GAME%,%ZS_PORT_VITE%,%ZS_PORT_AUTH%

echo.
if "%~1"=="silent" goto :fin
pause

:fin
