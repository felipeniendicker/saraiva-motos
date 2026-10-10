[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

function Get-RequiredEnvironmentValue {
    param([Parameter(Mandatory = $true)][string]$Name)

    $rawValue = [Environment]::GetEnvironmentVariable($Name, "Process")
    if ([string]::IsNullOrWhiteSpace($rawValue)) {
        throw "Variável obrigatória ausente: $Name."
    }

    return $rawValue
}

function Read-SecretText {
    param([Parameter(Mandatory = $true)][string]$Prompt)

    $secureValue = Read-Host $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function ConvertTo-FormComponent {
    param([AllowEmptyString()][string]$Value)

    return [Uri]::EscapeDataString($Value)
}

function Test-SafeErrorBody {
    param(
        [AllowEmptyString()][string]$Body,
        [string[]]$SensitiveValues
    )

    if ([string]::IsNullOrWhiteSpace($Body)) { return $false }
    foreach ($sensitiveValue in $SensitiveValues) {
        if (-not [string]::IsNullOrEmpty($sensitiveValue) -and $Body.Contains($sensitiveValue)) {
            return $false
        }
    }
    if ($Body -match '(?i)APP_USR-[A-Za-z0-9-]+' -or $Body -match '(?i)TG-[A-Za-z0-9-]+') {
        return $false
    }
    if ($Body -match '(?i)"(?:client_secret|code|access_token|refresh_token)"\s*:\s*"[^\"]+"') {
        return $false
    }
    return $true
}

try {
    $clientId = Get-RequiredEnvironmentValue "MERCADOLIVRE_CLIENT_ID"
    $clientSecret = Get-RequiredEnvironmentValue "MERCADOLIVRE_CLIENT_SECRET"
    $redirectUri = Get-RequiredEnvironmentValue "MERCADOLIVRE_REDIRECT_URI"

    $authorizationUrl = "https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=$([Uri]::EscapeDataString($clientId))&redirect_uri=$([Uri]::EscapeDataString($redirectUri))"
    Write-Host "URL de autorização:"
    Write-Host $authorizationUrl
    Write-Host "Abra a URL, autorize Saraiva Motos e copie o novo code recebido no redirect."

    $authorizationCode = Read-Host "Authorization Code"
    if ([string]::IsNullOrWhiteSpace($authorizationCode)) {
        throw "Authorization Code não informado."
    }

    $clientIdHasOuterSpaces = $clientId -ne $clientId.Trim()
    $clientSecretHasOuterSpaces = $clientSecret -ne $clientSecret.Trim()
    $clientIdHasQuotes = $clientId.Contains('"') -or $clientId.Contains("'")
    $clientSecretHasQuotes = $clientSecret.Contains('"') -or $clientSecret.Contains("'")
    $clientIdHasLineBreak = $clientId.Contains("`r") -or $clientId.Contains("`n")
    $clientSecretHasLineBreak = $clientSecret.Contains("`r") -or $clientSecret.Contains("`n")
    $redirectUriIsCorrect = $redirectUri -ceq "https://example.com/callback"

    Write-Host "Client ID presente: sim"
    Write-Host "Client ID comprimento: $($clientId.Length)"
    Write-Host "Client Secret presente: sim"
    Write-Host "Client Secret comprimento: $($clientSecret.Length)"
    Write-Host "Client ID possui espaços externos: $(if ($clientIdHasOuterSpaces) { 'sim' } else { 'não' })"
    Write-Host "Client Secret possui espaços externos: $(if ($clientSecretHasOuterSpaces) { 'sim' } else { 'não' })"
    Write-Host "Client ID possui aspas incorporadas: $(if ($clientIdHasQuotes) { 'sim' } else { 'não' })"
    Write-Host "Client Secret possui aspas incorporadas: $(if ($clientSecretHasQuotes) { 'sim' } else { 'não' })"
    Write-Host "Redirect URI correta: $(if ($redirectUriIsCorrect) { 'sim' } else { 'não' })"
    Write-Host "Authorization Code presente: sim"

    if ($clientIdHasOuterSpaces -or $clientSecretHasOuterSpaces -or
        $clientIdHasQuotes -or $clientSecretHasQuotes -or
        $clientIdHasLineBreak -or $clientSecretHasLineBreak) {
        throw "Client ID ou Client Secret possui espaços, aspas ou quebras de linha. Corrija a variável antes do POST."
    }
    if (-not $redirectUriIsCorrect) {
        throw "MERCADOLIVRE_REDIRECT_URI deve ser exatamente https://example.com/callback."
    }
    if ($clientId -eq $clientSecret) {
        throw "Client ID e Client Secret são iguais; confira as credenciais no DevCenter."
    }
    if ($clientId -notmatch '^\d+$') {
        Write-Warning "O Client ID não possui o formato numérico esperado para o ID da aplicação. Confira se ID e Secret não foram trocados."
    }
    if ($clientSecret -match '^\d+$' -and $clientId -notmatch '^\d+$') {
        throw "As credenciais parecem estar trocadas: ID da aplicação é o Client ID; chave secreta é o Client Secret."
    }

    Add-Type -AssemblyName System.Net.Http
    $formBody = @(
        "grant_type=$(ConvertTo-FormComponent 'authorization_code')"
        "client_id=$(ConvertTo-FormComponent $clientId)"
        "client_secret=$(ConvertTo-FormComponent $clientSecret)"
        "code=$(ConvertTo-FormComponent $authorizationCode.Trim())"
        "redirect_uri=$(ConvertTo-FormComponent $redirectUri)"
    ) -join '&'
    $tokenContent = [System.Net.Http.ByteArrayContent]::new([Text.Encoding]::UTF8.GetBytes($formBody))
    $tokenContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new("application/x-www-form-urlencoded")
    $httpClient = [System.Net.Http.HttpClient]::new()
    $httpClient.DefaultRequestHeaders.Accept.ParseAdd("application/json")

    try {
        $tokenHttpResponse = $httpClient.PostAsync(
            "https://api.mercadolibre.com/oauth/token",
            $tokenContent
        ).GetAwaiter().GetResult()
        $tokenResponseBody = $tokenHttpResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        $httpStatus = [int]$tokenHttpResponse.StatusCode
        $responseContentType = if ($null -ne $tokenHttpResponse.Content.Headers.ContentType) {
            $tokenHttpResponse.Content.Headers.ContentType.ToString()
        } else {
            "não informado"
        }

        if (-not $tokenHttpResponse.IsSuccessStatusCode) {
            $errorBody = $null
            try { $errorBody = $tokenResponseBody | ConvertFrom-Json } catch { $errorBody = $null }

            Write-Host "OAuth: FALHOU"
            Write-Host "HTTP status: $httpStatus"
            Write-Host "Content-Type da resposta: $responseContentType"
            if (Test-SafeErrorBody -Body $tokenResponseBody -SensitiveValues @($clientId, $clientSecret, $authorizationCode)) {
                Write-Host "Body bruto do erro: $tokenResponseBody"
            } else {
                Write-Host "Body bruto do erro: omitido por segurança"
            }
            if ($null -ne $errorBody) {
                Write-Host "error: $($errorBody.error)"
                Write-Host "message: $($errorBody.message)"
                Write-Host "status: $($errorBody.status)"
                Write-Host "cause: $($errorBody.cause | ConvertTo-Json -Compress -Depth 5)"
                if ($errorBody.error -eq "invalid_client") {
                    Write-Host "Diagnóstico: confira o ID da aplicação (Client ID) e a chave secreta (Client Secret) no DevCenter."
                }
                elseif ($errorBody.error -eq "invalid_grant") {
                    Write-Host "Diagnóstico: o code pode estar expirado, já utilizado ou associado a outra redirect URI/aplicação. Gere um code novo."
                }
            }
            exit 1
        }

        $tokenResponse = $tokenResponseBody | ConvertFrom-Json
    }
    catch {
        Write-Host "OAuth: FALHOU"
        Write-Host "HTTP status: 0"
        Write-Host "Content-Type da resposta: não disponível"
        Write-Host "Falha de rede antes de receber uma resposta HTTP do Mercado Livre."
        exit 1
    }
    finally {
        if ($null -ne $tokenContent) { $tokenContent.Dispose() }
        if ($null -ne $httpClient) { $httpClient.Dispose() }
    }

    $hasAccessToken = -not [string]::IsNullOrWhiteSpace($tokenResponse.access_token)
    $hasRefreshToken = -not [string]::IsNullOrWhiteSpace($tokenResponse.refresh_token)
    Write-Host "OAuth: OK"
    Write-Host "Access token recebido: $(if ($hasAccessToken) { 'sim' } else { 'não' })"
    Write-Host "Refresh token recebido: $(if ($hasRefreshToken) { 'sim' } else { 'não' })"
    Write-Host "expires_in: $($tokenResponse.expires_in)"
    Write-Host "user_id presente: $(if ($null -ne $tokenResponse.user_id) { 'sim' } else { 'não' })"

    if (-not $hasAccessToken) {
        throw "A resposta OAuth não contém access_token."
    }

    try {
        $meResponse = Invoke-WebRequest `
            -UseBasicParsing `
            -Method Get `
            -Uri "https://api.mercadolibre.com/users/me" `
            -Headers @{ Authorization = "Bearer $($tokenResponse.access_token)"; Accept = "application/json" }
        $me = $meResponse.Content | ConvertFrom-Json
        Write-Host "Token válido: sim"
        Write-Host "User ID recebido: $(if ($null -ne $me.id) { 'sim' } else { 'não' })"
        Write-Host "HTTP status: $([int]$meResponse.StatusCode)"
    }
    catch {
        $status = if ($null -ne $_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        Write-Host "Token válido: não"
        Write-Host "User ID recebido: não"
        Write-Host "HTTP status: $status"
        exit 1
    }
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
finally {
    $authorizationCode = $null
    $tokenResponse = $null
    $me = $null
}
