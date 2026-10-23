@echo off
rem Configuration partagée — tools/desktop/zs-server-*.bat
rem Chemins projet + Node 20 (better-sqlite3)

set "ZS_PROJECT=d:\Projects\zombie-survival"
set "ZS_NODE=%LOCALAPPDATA%\nvm\v20.19.4\node.exe"
if not exist "%ZS_NODE%" set "ZS_NODE=node"

set "ZS_PORT_GAME=3000"
set "ZS_PORT_VITE=5173"
set "ZS_PORT_AUTH=3001"

rem 1 = démarrer Vite dev (proxy API → :3000) — recommandé en dev
set "ZS_START_VITE=1"
rem 1 = démarrer auth-server interne (127.0.0.1:3001) — seulement si AUTH_MODE=standalone
set "ZS_START_AUTH=0"

rem npm / npx via le même Node que le serveur
set "ZS_NPM=%LOCALAPPDATA%\nvm\v20.19.4\npm.cmd"
if not exist "%ZS_NPM%" set "ZS_NPM=npm"

set "PATH=%LOCALAPPDATA%\nvm\v20.19.4;%PATH%"
