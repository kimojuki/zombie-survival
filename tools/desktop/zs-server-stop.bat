@echo off
title Zombie Survival — Arret serveur
setlocal enabledelayedexpansion
set "FOUND=0"

echo Recherche serveur sur le port 3000...
echo.

for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  set "FOUND=1"
  echo Arret PID %%P...
  taskkill /PID %%P /F
  if !ERRORLEVEL! equ 0 (
    echo OK — serveur arrete.
  ) else (
    echo [ERREUR] Impossible d'arreter PID %%P.
  )
)

if "!FOUND!"=="0" (
  echo Aucun serveur en ecoute sur le port 3000.
)

echo.
pause
