# Portfolio Verification Script
# Checks all pending work items

Write-Host "=== PORTFOLIO VERIFICATION ===" -ForegroundColor Cyan
Write-Host ""

$issues = @()
$pages = @("index.html", "homepage.html", "about.html", "contact.html", "project.html", "resume.html", "socialhandles.html")

# Check 1: Social buttons at TOP
Write-Host "1. Checking social buttons at TOP of pages..." -ForegroundColor Yellow
foreach ($page in $pages) {
    if (Test-Path $page) {
        $content = Get-Content $page -Raw
        if ($content -notmatch "linkedin.*github|github.*linkedin" -and $content -notmatch "social.*icon|icon.*social") {
            $issues += "$page - Missing social buttons in header/nav"
        }
    }
}

# Check 2: Social buttons at BOTTOM
Write-Host "2. Checking social buttons at BOTTOM of pages..." -ForegroundColor Yellow
foreach ($page in $pages) {
    if (Test-Path $page) {
        $content = Get-Content $page -Raw
        if ($content -notmatch "footer.*linkedin|footer.*github" -and $content -notmatch "social.*footer") {
            $issues += "$page - Missing social buttons in footer"
        }
    }
}

# Check 3: Project page Medium-style layout
Write-Host "3. Checking project page layout..." -ForegroundColor Yellow
if (Test-Path "project.html") {
    $content = Get-Content "project.html" -Raw
    if ($content -notmatch "left.*nav|navigation.*panel|table.*contents|toc") {
        $issues += "project.html - Missing Medium-style left navigation panel"
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

# Check 5: Disqus comments
Write-Host "5. Checking Disqus comments..." -ForegroundColor Yellow
if (Test-Path "project.html") {
    $content = Get-Content "project.html" -Raw
    if ($content -notmatch "disqus|disqus_thread") {
        $issues += "project.html - Missing Disqus comments section"
    }
}

# Check 6: Resume in navigation
Write-Host "6. Checking Resume link in navigation..." -ForegroundColor Yellow
foreach ($page in $pages) {
    if (Test-Path $page) {
        $content = Get-Content $page -Raw
        if ($content -match "nav|navigation" -and $content -notmatch "resume\.html|Resume") {
            if ($page -ne "resume.html") {
                $issues += "$page - Missing Resume link in navigation"
            }
        }
    }
}

# Check 7: About page transitions
Write-Host "7. Checking about page transitions..." -ForegroundColor Yellow
if (Test-Path "about.html") {
    $content = Get-Content "about.html" -Raw
    if ($content -notmatch "parallax|fade.*in|transition.*scroll") {
        $issues += "about.html - Missing enhanced Big Picture transitions"
    }
}

# Check 8: Contact form Formspree
Write-Host "8. Checking contact form integration..." -ForegroundColor Yellow
if (Test-Path "contact.html") {
    $content = Get-Content "contact.html" -Raw
    if ($content -notmatch "formspree\.io|YOUR_FORM_ID") {
        $issues += "contact.html - Missing Formspree integration (or still has placeholder)"
    }
}

# Summary
Write-Host ""
Write-Host "=== VERIFICATION SUMMARY ===" -ForegroundColor Cyan
if ($issues.Count -eq 0) {
    Write-Host "✅ All checks passed! No pending issues found." -ForegroundColor Green
} else {
    Write-Host "❌ Found $($issues.Count) pending issues:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  - $issue" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "See PENDING_WORK_SUMMARY.md for detailed task list." -ForegroundColor Cyan
