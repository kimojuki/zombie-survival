@echo off
title Zombie Survival Server
call "%~dp0zs-server-env.bat"

cd /d "%ZS_PROJECT%" || (
  echo [ERREUR] Projet introuvable: %ZS_PROJECT%
  goto :fin
)

for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo [ERREUR] Port 3000 deja utilise (PID %%P^).
  echo Utilisez "ZS - Arreter serveur" puis relancez.
  goto :fin
)

if not exist "%ZS_NODE%" (
  echo [ERREUR] Node introuvable: %ZS_NODE%
  goto :fin
)

echo ========================================
echo  Zombie Survival — serveur local
echo  http://localhost:3000
echo  Node: %ZS_NODE%
echo  Ctrl+C ou fermer cette fenetre = stop
echo ========================================
echo.

"%ZS_NODE%" apps\server\index.js
echo.
echo Serveur arrete (code %ERRORLEVEL%^).

:fin
pause
