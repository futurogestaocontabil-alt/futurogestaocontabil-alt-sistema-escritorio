$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath 'node_modules')) { npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'Não foi possível instalar as dependências.' } }
if (-not (Test-Path -LiteralPath 'dist\index.html')) { npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'Não foi possível preparar a interface.' } }
Write-Host 'Plataforma Futuro: http://127.0.0.1:4318'
npm.cmd start
