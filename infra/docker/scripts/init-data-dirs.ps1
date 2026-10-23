# Crée les dossiers bind mount (Windows / dev)
$ErrorActionPreference = 'Stop'
$dockerDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $dockerDir '.env'
$data = Join-Path $dockerDir 'data'

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*ZS_DATA_DIR=(.+)$') {
      $v = $Matches[1].Trim().Trim('"')
      if ([System.IO.Path]::IsPathRooted($v)) { $data = $v } else { $data = Join-Path $dockerDir $v }
    }
  }
}

foreach ($sub in @('mariadb', 'backups', 'logs')) {
  New-Item -ItemType Directory -Force -Path (Join-Path $data $sub) | Out-Null
}
Write-Host "[init-data-dirs] OK $data"
