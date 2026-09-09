# Test RBAC Permission Fix
Write-Host "Starting permission fix test..." -ForegroundColor Cyan

# Step 1: Login
Write-Host "`n[1] Logging in as admin@stream.uz..." -ForegroundColor Yellow
try {
        $loginResponse = Invoke-WebRequest `
                -Uri "http://localhost:8080/api/v1/auth/login" `
                -Method Post `
                -Body (ConvertTo-Json @{email = "admin@stream.uz"; password = "Qwerty123!" }) `
                -ContentType "application/json" `
                -UseBasicParsing `
                -ErrorAction Stop
    
        $loginJson = $loginResponse.Content | ConvertFrom-Json
        $token = $loginJson.data.accessToken
    
        if ($token) {
                Write-Host "✓ Login successful" -ForegroundColor Green
                Write-Host "Token: $($token.Substring(0, 50))..."
        }
        else {
                Write-Host "✗ Failed to get token from response" -ForegroundColor Red
                Write-Host "Response: $($loginResponse.Content)"
                exit 1
        }
}
catch {
        Write-Host "✗ Login failed: $_" -ForegroundColor Red
        exit 1
}

# Step 2: Test Analytics Endpoint
Write-Host "`n[2] Testing /api/v1/analytics/overview endpoint..." -ForegroundColor Yellow
try {
        $analyticsResponse = Invoke-WebRequest `
                -Uri "http://localhost:8080/api/v1/analytics/overview" `
                -Method Get `
                -Headers @{"Authorization" = "Bearer $token" } `
                -ContentType "application/json" `
                -UseBasicParsing `
                -ErrorAction Stop
    
        $analyticsJson = $analyticsResponse.Content | ConvertFrom-Json
    
        if ($analyticsResponse.StatusCode -eq 200) {
                Write-Host "✓ Analytics endpoint returned 200" -ForegroundColor Green
                Write-Host "Response:" 
                $analyticsJson | ConvertTo-Json | Out-Host
        }
        else {
                Write-Host "✗ Unexpected status code: $($analyticsResponse.StatusCode)" -ForegroundColor Red
        }
}
catch {
        $errorResponse = $_.Exception.Response
        if ($errorResponse.StatusCode -eq "Forbidden") {
                Write-Host "✗ Analytics endpoint returned 403 Forbidden" -ForegroundColor Red
                Write-Host "The permission fix did NOT work!" -ForegroundColor Red
        }
        else {
                Write-Host "✗ Request failed: $_" -ForegroundColor Red
        }
    
        try {
                $errorContent = $_.Exception.Response.Content.ReadAsStream() | ForEach-Object { [System.IO.StreamReader]::new($_).ReadToEnd() }
                Write-Host "Error details: $errorContent"
        }
        catch {}
}

# Step 3: Test User Endpoint
Write-Host "`n[3] Testing /api/v1/users endpoint..." -ForegroundColor Yellow
try {
        $usersResponse = Invoke-WebRequest `
                -Uri "http://localhost:8080/api/v1/users" `
                -Method Get `
                -Headers @{"Authorization" = "Bearer $token" } `
                -ContentType "application/json" `
                -UseBasicParsing `
                -ErrorAction Stop
    
        $usersJson = $usersResponse.Content | ConvertFrom-Json
    
        if ($usersResponse.StatusCode -eq 200) {
                Write-Host "✓ Users endpoint returned 200" -ForegroundColor Green
                Write-Host "Users count: $($usersJson.data.Count)"
        }
        else {
                Write-Host "✗ Unexpected status code: $($usersResponse.StatusCode)" -ForegroundColor Red
        }
}
catch {
        $errorResponse = $_.Exception.Response
        if ($errorResponse.StatusCode -eq "Forbidden") {
                Write-Host "✗ Users endpoint returned 403 Forbidden" -ForegroundColor Red
        }
        else {
                Write-Host "✗ Request failed: $_" -ForegroundColor Red
        }
}

Write-Host "`n[✓] Test completed" -ForegroundColor Cyan
