[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $HostName,
    [int] $Port = 3306,
    [Parameter(Mandatory)] [string] $Database,
    [Parameter(Mandatory)] [string] $User,
    [Parameter(Mandatory)] [string] $DumpPath,
    [Parameter(Mandatory)] [string] $Confirmation,
    [switch] $CreateDatabase
)

$ErrorActionPreference = "Stop"
if ($Database -notmatch '^[A-Za-z0-9_]+$') { throw "Nome de banco invalido." }
if ($Database -notmatch '(?i)(homolog|staging|test|teste|temp|sandbox)') {
    throw "Restauracao recusada: o banco deve ter nome inequivocamente descartavel."
}
if ($Confirmation -cne "RESTORE:$Database") {
    throw "Confirmacao invalida. Informe exatamente RESTORE:$Database."
}
if (-not (Get-Command mysql -ErrorAction SilentlyContinue)) { throw "Cliente mysql nao encontrado no PATH." }

$resolvedDump = (Resolve-Path -LiteralPath $DumpPath).Path
$hashPath = "$resolvedDump.sha256"
if (Test-Path -LiteralPath $hashPath) {
    $expected = ((Get-Content -LiteralPath $hashPath -Raw).Trim() -split '\s+')[0]
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedDump).Hash.ToLowerInvariant()
    if ($expected -ne $actual) { throw "SHA-256 do backup nao confere; restauracao cancelada." }
}
else {
    Write-Warning "Arquivo .sha256 nao encontrado. Confirme manualmente a origem do backup."
}

$password = $env:SARAIVA_DB_PASSWORD
if ([string]::IsNullOrEmpty($password)) {
    $secure = Read-Host "Senha MySQL temporaria (nao sera exibida)" -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

$previousPassword = $env:MYSQL_PWD
try {
    $env:MYSQL_PWD = $password
    if ($CreateDatabase) {
        & mysql --host=$HostName --port=$Port --user=$User --default-character-set=utf8mb4 `
            --execute="CREATE DATABASE IF NOT EXISTS ``$Database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel criar o banco temporario." }
    }
    $tableCount = & mysql --host=$HostName --port=$Port --user=$User --database=$Database `
        --batch --skip-column-names `
        --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE();"
    if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel verificar se o banco temporario esta vazio." }
    if ([int]$tableCount -ne 0) {
        throw "Restauracao recusada: o banco temporario ja possui tabelas. Use um banco novo e vazio."
    }
    $process = Start-Process -FilePath mysql -NoNewWindow -Wait -PassThru `
        -ArgumentList @("--host=$HostName", "--port=$Port", "--user=$User", "--database=$Database", "--default-character-set=utf8mb4") `
        -RedirectStandardInput $resolvedDump
    if ($process.ExitCode -ne 0) { throw "A restauracao falhou com codigo $($process.ExitCode)." }
    Write-Host "Backup restaurado somente em: $HostName/$Database"
}
finally {
    $env:MYSQL_PWD = $previousPassword
    $password = $null
}
