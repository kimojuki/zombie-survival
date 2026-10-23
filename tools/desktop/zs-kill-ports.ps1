# Arrête les processus en écoute sur les ports dev Zombie Survival.
param(
    [string]$Ports = '3000,5173,3001'
)

$portList = @($Ports -split ',' | ForEach-Object { [int]$_.Trim() } | Where-Object { $_ -gt 0 })
$ErrorActionPreference = 'SilentlyContinue'
$killed = @{}

foreach ($port in $portList) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $procId = $c.OwningProcess
        if (-not $procId -or $killed.ContainsKey($procId)) { continue }
        try {
            $proc = Get-Process -Id $procId -ErrorAction Stop
            Write-Host "  Port $port - arret $($proc.ProcessName) (PID $procId)"
            Stop-Process -Id $procId -Force
            $killed[$procId] = $true
        } catch {
            Write-Host "  Port $port - [WARN] PID $procId introuvable"
        }
    }
}

if ($killed.Count -eq 0) {
    Write-Host "  Aucun serveur en ecoute sur $($portList -join ', ')."
} else {
    Write-Host "  OK - $($killed.Count) processus arretes."
}
