[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $HostName,
    [int] $Port = 3306,
    [Parameter(Mandatory)] [string] $Database,
    [Parameter(Mandatory)] [string] $User,
    [string] $OutputDirectory = (Join-Path $PSScriptRoot "backups")
)

$ErrorActionPreference = "Stop"
if ($Database -notmatch '^[A-Za-z0-9_]+$') { throw "Nome de banco invalido." }
if (-not (Get-Command mysqldump -ErrorAction SilentlyContinue)) { throw "mysqldump nao encontrado no PATH." }

$outputRoot = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpPath = Join-Path $outputRoot "$Database-$timestamp.sql"
$hashPath = "$dumpPath.sha256"
$metadataPath = "$dumpPath.metadata.json"

$password = $env:SARAIVA_DB_PASSWORD
if ([string]::IsNullOrEmpty($password)) {
    $secure = Read-Host "Senha MySQL (nao sera exibida)" -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

$previousPassword = $env:MYSQL_PWD
try {
    $env:MYSQL_PWD = $password
    & mysqldump --host=$HostName --port=$Port --user=$User `
        --default-character-set=utf8mb4 --single-transaction --quick `
        --routines --events --triggers --hex-blob --set-gtid-purged=OFF `
        --no-tablespaces $Database --result-file=$dumpPath
    if ($LASTEXITCODE -ne 0) { throw "O backup falhou com codigo $LASTEXITCODE." }

    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $dumpPath).Hash.ToLowerInvariant()
    "$hash  $([IO.Path]::GetFileName($dumpPath))" | Set-Content -LiteralPath $hashPath -Encoding ascii
    [ordered]@{
        createdAt = (Get-Date).ToUniversalTime().ToString("o")
        host = $HostName
        port = $Port
        database = $Database
        user = $User
        sha256 = $hash
        file = [IO.Path]::GetFileName($dumpPath)
    } | ConvertTo-Json | Set-Content -LiteralPath $metadataPath -Encoding utf8
    Write-Host "Backup criado: $dumpPath"
    Write-Host "SHA-256: $hash"
}
finally {
    $env:MYSQL_PWD = $previousPassword
    $password = $null
}
