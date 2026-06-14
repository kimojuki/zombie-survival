# Affiche l'état des serveurs dev (health + ports).
param(
    [string]$ProjectRoot = 'd:\Projects\zombie-survival'
)

$ports = @{
    3000 = 'Game + front public'
    5173 = 'Vite dev client'
    3001 = 'Auth interne'
}

Write-Host ''
Write-Host '========================================'
Write-Host ' Zombie Survival - statut serveurs'
Write-Host '========================================'

foreach ($entry in $ports.GetEnumerator() | Sort-Object Name) {
    $port = $entry.Key
    $label = $entry.Value
    $listen = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listen) {
        $proc = Get-Process -Id $listen.OwningProcess -ErrorAction SilentlyContinue
        Write-Host ("  [{0}] {1} - PID {2} ({3})" -f $port, $label, $listen.OwningProcess, $proc.ProcessName)
    } else {
        Write-Host ("  [{0}] {1} - arrete" -f $port, $label)
    }
}

Write-Host ''
Write-Host 'Health checks:'

try {
    $game = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 3
    Write-Host ("  Game :3000 - OK ready={0} client={1}" -f $game.ready, $game.clientVersion)
} catch {
    Write-Host '  Game :3000 - indisponible'
}

try {
    $info = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/server-info' -TimeoutSec 3
    Write-Host ("  Auth mode - {0} (handoff={1})" -f $info.authMode, $info.handoffEnabled)
} catch { }

try {
    $auth = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/health' -TimeoutSec 2
    Write-Host ("  Auth :3001 - OK service={0}" -f $auth.service)
} catch {
    Write-Host '  Auth :3001 - arrete (normal en mode embedded)'
}

Write-Host ''
Write-Host 'URLs:'
Write-Host '  http://localhost:3000        (game + landing, tunnel Cloudflare)'
Write-Host '  http://localhost:5173        (Vite dev - proxy vers :3000)'
Write-Host ''
