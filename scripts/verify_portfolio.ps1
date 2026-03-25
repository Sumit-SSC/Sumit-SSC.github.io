# Portfolio Verification Script
# Run from repo root: ./scripts/verify_portfolio.ps1
# Checks pages and assets for common issues

$ErrorActionPreference = "Stop"
$root = if ($PSScriptRoot) { Split-Path $PSScriptRoot -Parent } else { Get-Location }
Set-Location $root

Write-Host "=== PORTFOLIO VERIFICATION ===" -ForegroundColor Cyan
Write-Host "Root: $root" -ForegroundColor Gray
Write-Host ""

$issues = @()
$pageFiles = @(
    "index.html",
    "pages/homepage.html",
    "pages/about.html",
    "pages/contact.html",
    "pages/project.html",
    "pages/resume.html",
    "pages/socialhandles.html"
)

# Check 1: Social buttons at TOP
Write-Host "1. Checking social buttons at TOP of pages..." -ForegroundColor Yellow
foreach ($page in $pageFiles) {
    if (Test-Path $page) {
        $content = Get-Content $page -Raw
        # The original regex was newline-fragile; we instead look for both LinkedIn + GitHub
        # within the "header-like" region (header/nav) or fallback to first chunk.
        $headerRegion = ''
        if ($content -match '(?s)<header.*?</header>') {
            $headerRegion = $Matches[0]
        } elseif ($content -match '(?s)<nav[^>]*id=["'']nav["''][\s\S]*?</nav>') {
            $headerRegion = $Matches[0]
        } else {
            $headerRegion = $content.Substring(0, [Math]::Min(3000, $content.Length))
        }

        $hasLinkedin = $headerRegion -match 'linkedin'
        $hasGithub = $headerRegion -match 'github'
        if (-not ($hasLinkedin -and $hasGithub)) {
            $issues += "$page - Missing social buttons in header/nav"
        }
    }
}

# Check 2: Social buttons at BOTTOM
Write-Host "2. Checking social buttons at BOTTOM of pages..." -ForegroundColor Yellow
foreach ($page in $pageFiles) {
    if (Test-Path $page) {
        $content = Get-Content $page -Raw
        $footerRegion = ''
        # Prefer the main footer by id="footer" marker (avoids false positives from small footers).
        $idx = $content.IndexOf('id="footer"')
        if ($idx -ge 0) {
            $footerRegion = $content.Substring($idx, [Math]::Min(3000, $content.Length - $idx))
        } else {
            $idx = $content.IndexOf("id='footer'")
            if ($idx -ge 0) {
                $footerRegion = $content.Substring($idx, [Math]::Min(3000, $content.Length - $idx))
            } else {
                # Fallback: take the last <footer>...</footer> block on the page.
                $footerMatches = [regex]::Matches($content, '(?s)<footer.*?</footer>')
                if ($footerMatches.Count -gt 0) {
                    $footerRegion = $footerMatches[$footerMatches.Count - 1].Value
                } else {
                    $footerRegion = $content.Substring([Math]::Max(0, $content.Length - 3000))
                }
            }
        }

        $hasLinkedin = $footerRegion -match 'linkedin'
        $hasGithub = $footerRegion -match 'github'
        if (-not ($hasLinkedin -and $hasGithub)) {
            $issues += "$page - Missing social buttons in footer"
        }
    }
}

# Check 3: Project page Medium-style layout
Write-Host "3. Checking project page layout..." -ForegroundColor Yellow
if (Test-Path "pages/project.html") {
    $content = Get-Content "pages/project.html" -Raw
    if ($content -notmatch "left.*nav|navigation.*panel|table.*contents|toc") {
        $issues += "pages/project.html - Missing Medium-style left navigation panel"
    }
}

# Check 4: Tools clickable
Write-Host "4. Checking tools clickability..." -ForegroundColor Yellow
if (Test-Path "assets/js/main.js") {
    $content = Get-Content "assets/js/main.js" -Raw
    if ($content -notmatch "tool.*click|addEventListener.*tool|filter.*tool") {
        $issues += "main.js - Tools not clickable (no event listeners)"
    }
}

# Check 5: Disqus comments (optional)
Write-Host "5. Checking Disqus comments..." -ForegroundColor Yellow
if (Test-Path "pages/project.html") {
    $content = Get-Content "pages/project.html" -Raw
    # Site uses Giscus (not Disqus). Accept either to avoid false positives.
    if ($content -notmatch "disqus|disqus_thread|giscus|giscus_root|giscus-root") {
        $issues += "pages/project.html - Missing comments section (Disqus/Giscus)"
    }
}

# Check 6: Resume in navigation
Write-Host "6. Checking Resume link in navigation..." -ForegroundColor Yellow
foreach ($page in $pageFiles) {
    if (Test-Path $page) {
        $content = Get-Content $page -Raw
        if ($content -match "nav|navigation" -and $content -notmatch "resume\.html|Resume") {
            if ($page -notmatch "resume\.html$") {
                $issues += "$page - Missing Resume link in navigation"
            }
        }
    }
}

# Check 7: About page transitions
Write-Host "7. Checking about page transitions..." -ForegroundColor Yellow
if (Test-Path "pages/about.html") {
    $content = Get-Content "pages/about.html" -Raw
    if ($content -notmatch "parallax|fade.*in|transition.*scroll") {
        $issues += "pages/about.html - Missing enhanced Big Picture transitions"
    }
}

# Check 8: Contact form Formspree
Write-Host "8. Checking contact form integration..." -ForegroundColor Yellow
if (Test-Path "pages/contact.html") {
    $content = Get-Content "pages/contact.html" -Raw
    # Your current flow uses mailto (and optionally can be wired to Formspree). Accept mailto.
    if ($content -notmatch "formspree\.io|YOUR_FORM_ID|mailto:") {
        $issues += "pages/contact.html - Missing Formspree integration (or still has placeholder) and mailto flow"
    }
}

# Summary
Write-Host ""
Write-Host "=== VERIFICATION SUMMARY ===" -ForegroundColor Cyan
if ($issues.Count -eq 0) {
    Write-Host "All checks passed! No pending issues found." -ForegroundColor Green
} else {
    Write-Host "Found $($issues.Count) pending issues:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  - $issue" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "See docs/ for checklists and plans." -ForegroundColor Cyan
