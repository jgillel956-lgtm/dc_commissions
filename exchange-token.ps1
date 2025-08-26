# Zoho OAuth Token Exchange Script
# This script bypasses SSL revocation issues on Windows

param(
    [Parameter(Mandatory=$true)]
    [string]$AuthCode,
    
    [Parameter(Mandatory=$true)]
    [string]$ClientId,
    
    [Parameter(Mandatory=$true)]
    [string]$ClientSecret
)

# Disable SSL revocation check for this session
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

try {
    $body = @{
        code = $AuthCode
        client_id = $ClientId
        client_secret = $ClientSecret
        redirect_uri = "https://dc-commissions.vercel.app/oauth-callback.html"
        grant_type = "authorization_code"
    }

    $response = Invoke-RestMethod -Uri "https://accounts.zoho.com/oauth/v2/token" -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
    
    Write-Host "SUCCESS: Token exchange successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access Token: $($response.access_token)" -ForegroundColor Yellow
    Write-Host "Refresh Token: $($response.refresh_token)" -ForegroundColor Yellow
    Write-Host "Expires In: $($response.expires_in) seconds" -ForegroundColor Yellow
    Write-Host "Scope: $($response.scope)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "SECURITY: Copy the refresh_token above and update your Vercel environment variable:" -ForegroundColor Cyan
    Write-Host "   REACT_APP_ZOHO_REFRESH_TOKEN" -ForegroundColor White
    
} catch {
    Write-Host "ERROR: Token exchange failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
