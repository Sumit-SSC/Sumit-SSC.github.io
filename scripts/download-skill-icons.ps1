<# 
Downloads all skill icons from CDN URLs to assets/images/icons/

Run from project root:
  powershell -ExecutionPolicy Bypass -File scripts/download-skill-icons.ps1

Icon source list:
  data/skill_icon_urls.json
#>

$ErrorActionPreference = "Stop"

function Get-ProjectRoot {
	# scripts/ -> project root
	return (Split-Path -Parent $PSScriptRoot)
}

function Get-Slug([string]$Key) {
	$slug = $Key.ToLowerInvariant()
	$slug = [Regex]::Replace($slug, "\s+", "-")
	$slug = $slug.Replace("(", "").Replace(")", "")
	$slug = $slug.Replace("&", "and")
	return $slug
}

function Get-Ext([string]$Url) {
	if ($Url -match "\.(png|svg|webp)(\?|$)") {
		return $Matches[1].ToLowerInvariant()
	}
	return "png"
}

$ProjectRoot = Get-ProjectRoot
$IconsJson = Join-Path $ProjectRoot "data\skill_icon_urls.json"
$OutDir = Join-Path $ProjectRoot "assets\images\icons"

if (!(Test-Path $IconsJson)) {
	throw "Missing file: $IconsJson"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$urls = Get-Content $IconsJson -Raw | ConvertFrom-Json

$ok = 0
$fail = 0

foreach ($prop in $urls.PSObject.Properties) {
	$key = $prop.Name
	$url = [string]$prop.Value

	$slug = Get-Slug $key
	$ext = Get-Ext $url
	$outFile = Join-Path $OutDir ("{0}.{1}" -f $slug, $ext)

	try {
		Invoke-WebRequest `
			-Uri $url `
			-OutFile $outFile `
			-MaximumRedirection 5 `
			-Headers @{ "User-Agent" = "Mozilla/5.0" } | Out-Null

		Write-Host ("OK: {0} -> {1}" -f $key, (Split-Path -Leaf $outFile))
		$ok++
	} catch {
		Write-Host ("FAIL: {0} ({1})" -f $key, $url)
		$fail++
	}
}

Write-Host ""
Write-Host ("Done. {0} downloaded, {1} failed." -f $ok, $fail)
