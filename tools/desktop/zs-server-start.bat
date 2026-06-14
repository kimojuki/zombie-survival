@echo off
title Zombie Survival — Demarrer serveurs
call "%~dp0zs-server-env.bat"

if /i "%~1"=="--auth" set "ZS_START_AUTH=1"
if /i "%~1"=="--standalone" set "ZS_START_AUTH=1"

cd /d "%ZS_PROJECT%" || (
  echo [ERREUR] Projet introuvable: %ZS_PROJECT%
  goto :fin
)

rem --- Verifier ports libres ---
set "BLOCKED=0"
for %%P in (%ZS_PORT_GAME% %ZS_PORT_VITE%) do (
  netstat -ano | findstr ":%%P " | findstr "LISTENING" >nul 2>&1
  if not errorlevel 1 (
    echo [ERREUR] Port %%P deja utilise.
    set "BLOCKED=1"
  )
)
if "%ZS_START_AUTH%"=="1" (
  netstat -ano | findstr ":%ZS_PORT_AUTH% " | findstr "LISTENING" >nul 2>&1
  if not errorlevel 1 (
    echo [ERREUR] Port %ZS_PORT_AUTH% deja utilise.
    set "BLOCKED=1"
  )
)
if "%BLOCKED%"=="1" (
  echo.
  echo Utilisez "ZS - Redemarrer serveurs" ou "ZS - Arreter serveurs" puis relancez.
  goto :fin
)

echo ========================================
echo  Zombie Survival — demarrage dev
echo  Game   : http://localhost:%ZS_PORT_GAME%
if "%ZS_START_VITE%"=="1" echo  Vite   : http://localhost:%ZS_PORT_VITE%
if "%ZS_START_AUTH%"=="1" echo  Auth   : http://127.0.0.1:%ZS_PORT_AUTH% (interne)
if "%ZS_START_AUTH%"=="1" (
  echo  Mode     : AUTH standalone (proxy auth -^> :%ZS_PORT_AUTH%)
)
echo  Node   : %ZS_NODE%
echo ========================================
echo.

rem --- Game server (front public + socket) ---
if "%ZS_START_AUTH%"=="1" (
  start "ZS Game :%ZS_PORT_GAME% [standalone]" /D "%ZS_PROJECT%" cmd /k "cd /d "%ZS_PROJECT%" && set AUTH_MODE=standalone&& set AUTH_INTERNAL_URL=http://127.0.0.1:%ZS_PORT_AUTH%&& "%ZS_NPM%" start"
) else (
  start "ZS Game :%ZS_PORT_GAME%" /D "%ZS_PROJECT%" cmd /k "cd /d "%ZS_PROJECT%" && "%ZS_NPM%" start"
)
timeout /t 1 /nobreak >nul

rem --- Vite dev client ---
if "%ZS_START_VITE%"=="1" (
  start "ZS Vite :%ZS_PORT_VITE%" /D "%ZS_PROJECT%" cmd /k "cd /d "%ZS_PROJECT%" && "%ZS_NPM%" run dev:client"
  timeout /t 1 /nobreak >nul
)

rem --- Auth interne (optionnel) ---
if "%ZS_START_AUTH%"=="1" (
  start "ZS Auth :%ZS_PORT_AUTH%" /D "%ZS_PROJECT%" cmd /k "cd /d "%ZS_PROJECT%" && set AUTH_HOST=127.0.0.1&& set AUTH_PORT=%ZS_PORT_AUTH%&& "%ZS_NPM%" run start:auth"
  timeout /t 1 /nobreak >nul
)

echo Attente demarrage (5 s)...
timeout /t 5 /nobreak >nul

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0zs-server-status.ps1"

echo.
echo Fenetres separees : Game / Vite / Auth — fermer une fenetre = stop ce service.
echo Pour tout arreter : raccourci "ZS - Arreter serveurs".

:fin
echo.
pause
