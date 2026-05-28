@echo off
echo.
echo  Deploiement Zombie Survival...
echo.

cd /d "%~dp0"

git add .

set /p msg="Message du commit (ou Entree pour 'update'): "
if "%msg%"=="" set msg=update

git commit -m "%msg%"

git push origin master

echo.
echo  Deploiement termine ! Infomaniak va redemarrer automatiquement.
echo.
pause
