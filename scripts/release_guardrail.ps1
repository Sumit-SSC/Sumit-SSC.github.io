$ErrorActionPreference = "Stop"

$root = if ($PSScriptRoot) { Split-Path $PSScriptRoot -Parent } else { Get-Location }
Set-Location $root

Write-Host "=== RELEASE GUARDRAIL ===" -ForegroundColor Cyan
Write-Host "Root: $root" -ForegroundColor Gray
Write-Host ""

$failed = $false

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    Write-Host ("-> " + $Name) -ForegroundColor Yellow
    try {
        & $Action
        Write-Host ("   OK: " + $Name) -ForegroundColor Green
    }
    catch {
        $script:failed = $true
        Write-Host ("   FAIL: " + $Name) -ForegroundColor Red
        Write-Host ("   " + $_.Exception.Message) -ForegroundColor DarkYellow
    }
    Write-Host ""
}

Run-Step "Validate content references" {
    python scripts/validate_content.py | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "validate_content.py reported failures." }
}

Run-Step "Audit image references" {
    python scripts/audit_images.py | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "audit_images.py reported failures." }
}

Run-Step "Portfolio page structure checks" {
    powershell -ExecutionPolicy Bypass -File scripts/verify_portfolio.ps1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "verify_portfolio.ps1 reported failures." }
}

Run-Step "Git working tree status" {
    git status --short | Out-Host
}

Run-Step "Recent commits snapshot" {
    git log -5 --oneline | Out-Host
}

if ($failed) {
    Write-Host "Release guardrail completed with failures." -ForegroundColor Red
    exit 1
}

Write-Host "Release guardrail completed successfully." -ForegroundColor Green
exit 0

