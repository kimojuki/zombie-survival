@echo off
title Zombie Survival — Redemarrage serveur
call "%~dp0zs-server-env.bat"

echo Redemarrage du serveur Zombie Survival...
echo.

set "FOUND=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  set "FOUND=1"
  echo Arret PID %%P...
  taskkill /PID %%P /F >nul 2>&1
)

if "%FOUND%"=="1" (
  echo Attente 2 secondes...
  timeout /t 2 /nobreak >nul
) else (
  echo Aucun serveur actif — demarrage direct.
)

echo.
call "%~dp0zs-server-start.bat"
