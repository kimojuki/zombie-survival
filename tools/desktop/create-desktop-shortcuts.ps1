# Cree les raccourcis bureau pour start / stop / restart du serveur local.
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath('Desktop')
$cmd = "$env:ComSpec"
$wsh = New-Object -ComObject WScript.Shell

$shortcuts = @(
    @{
        Name  = 'ZS - Demarrer serveur'
        Bat   = Join-Path $scriptDir 'zs-server-start.bat'
        Icon  = 'imageres.dll,109'
    },
    @{
        Name  = 'ZS - Arreter serveur'
        Bat   = Join-Path $scriptDir 'zs-server-stop.bat'
        Icon  = 'imageres.dll,108'
    },
    @{
        Name  = 'ZS - Redemarrer serveur'
        Bat   = Join-Path $scriptDir 'zs-server-restart.bat'
        Icon  = 'imageres.dll,112'
    }
)

foreach ($s in $shortcuts) {
    $lnkPath = Join-Path $desktop ($s.Name + '.lnk')
    $lnk = $wsh.CreateShortcut($lnkPath)
    # cmd /k garde la fenetre ouverte (logs serveur ou message d'erreur)
    $lnk.TargetPath = $cmd
    $lnk.Arguments = '/k "' + $s.Bat + '"'
    $lnk.WorkingDirectory = $scriptDir
    $lnk.WindowStyle = 1
    $lnk.Description = 'Zombie Survival — serveur local (port 3000)'
    $lnk.IconLocation = $s.Icon
    $lnk.Save()
    Write-Host "OK  $lnkPath"
}

Write-Host "`nRaccourcis crees sur le bureau."
