@echo off
rem Chemins projet + Node 20 (better-sqlite3) — voir DEV_TRACKER.md
set "ZS_PROJECT=d:\Projects\zombie-survival"
set "ZS_NODE=%LOCALAPPDATA%\nvm\v20.19.4\node.exe"
if not exist "%ZS_NODE%" set "ZS_NODE=node"
