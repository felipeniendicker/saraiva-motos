[CmdletBinding()]
param([string] $OutputPath = (Join-Path $PSScriptRoot "migration-files.sha256"))

$ErrorActionPreference = "Stop"
$migrationRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../src/main/resources/db/migration"))
$lines = Get-ChildItem -LiteralPath $migrationRoot -Filter "V*.sql" -File |
    Sort-Object Name |
    ForEach-Object {
        $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant()
        "$hash  $($_.Name)"
    }
$lines | Set-Content -LiteralPath $OutputPath -Encoding ascii
Write-Host "Manifesto SHA-256 criado em: $([IO.Path]::GetFullPath($OutputPath))"
Write-Warning "Os hashes auditam arquivos; nao substituem os checksums CRC32 do Flyway nem flyway validate."
