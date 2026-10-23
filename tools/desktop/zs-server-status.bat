@echo off
title Zombie Survival — Statut serveurs
call "%~dp0zs-server-env.bat"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0zs-server-status.ps1"
echo.
pause
