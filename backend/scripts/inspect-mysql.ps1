[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $HostName,
    [int] $Port = 3306,
    [Parameter(Mandatory)] [string] $Database,
    [Parameter(Mandatory)] [string] $User
)

$ErrorActionPreference = "Stop"
if ($Database -notmatch '^[A-Za-z0-9_]+$') { throw "Nome de banco invalido." }
if (-not (Get-Command mysql -ErrorAction SilentlyContinue)) { throw "Cliente mysql nao encontrado no PATH." }

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
    $sqlPath = (Join-Path $PSScriptRoot "validate-migrations.sql").Replace('\', '/')
    & mysql --host=$HostName --port=$Port --user=$User --database=$Database `
        --default-character-set=utf8mb4 --table --execute="source $sqlPath"
    if ($LASTEXITCODE -ne 0) { throw "A inspecao MySQL falhou com codigo $LASTEXITCODE." }
}
finally {
    $env:MYSQL_PWD = $previousPassword
    $password = $null
}
