# Cree / met a jour les raccourcis bureau pour la stack dev Zombie Survival.
# Usage : powershell -ExecutionPolicy Bypass -File tools\desktop\create-desktop-shortcuts.ps1

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath('Desktop')
$cmd = $env:ComSpec
$wsh = New-Object -ComObject WScript.Shell

$shortcuts = @(
    @{
        Name        = 'ZS - Demarrer serveurs'
        Bat         = Join-Path $scriptDir 'zs-server-start.bat'
        Icon        = 'imageres.dll,109'
        Description = 'Zombie Survival — game :3000 + Vite :5173 (fenetres separees)'
    },
    @{
        Name        = 'ZS - Arreter serveurs'
        Bat         = Join-Path $scriptDir 'zs-server-stop.bat'
        Icon        = 'imageres.dll,108'
        Description = 'Arrete game :3000, Vite :5173, auth :3001'
    },
    @{
        Name        = 'ZS - Redemarrer serveurs'
        Bat         = Join-Path $scriptDir 'zs-server-restart.bat'
        Icon        = 'imageres.dll,112'
        Description = 'Stop + start game + Vite (apres changements serveur)'
    },
    @{
        Name        = 'ZS - Statut serveurs'
        Bat         = Join-Path $scriptDir 'zs-server-status.bat'
        Icon        = 'imageres.dll,84'
        Description = 'Ports, health /api/health, URLs locales'
    },
    @{
        Name        = 'ZS - Demarrer (+ auth)'
        Bat         = Join-Path $scriptDir 'zs-server-start.bat'
        BatArgs     = '--auth'
        Icon        = 'imageres.dll,109'
        Description = 'Game + Vite + auth interne :3001 (AUTH_MODE standalone)'
    }
)

# Supprimer anciens noms (migration raccourcis)
$legacy = @(
    'ZS - Demarrer serveur',
    'ZS - Arreter serveur',
    'ZS - Redemarrer serveur'
)
foreach ($old in $legacy) {
    $oldPath = Join-Path $desktop ($old + '.lnk')
    if (Test-Path $oldPath) {
        Remove-Item $oldPath -Force
        Write-Host "Supprime ancien raccourci: $old"
    }
}

foreach ($s in $shortcuts) {
    $lnkPath = Join-Path $desktop ($s.Name + '.lnk')
    $lnk = $wsh.CreateShortcut($lnkPath)
    $lnk.TargetPath = $cmd
    if ($s.BatArgs) {
        $lnk.Arguments = '/k "' + $s.Bat + '" ' + $s.BatArgs
    } else {
        $lnk.Arguments = '/k "' + $s.Bat + '"'
    }
    $lnk.WorkingDirectory = $scriptDir
    $lnk.WindowStyle = 1
    $lnk.Description = $s.Description
    $lnk.IconLocation = $s.Icon
    $lnk.Save()
    Write-Host "OK  $lnkPath"
}

Write-Host "`nRaccourcis mis a jour sur le bureau."
Write-Host "Game public : http://localhost:3000  |  Vite : http://localhost:5173"
