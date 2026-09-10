# Gendan sitet til versionen lige før rapporten blev indarbejdet.
# Kør i PowerShell:  powershell -ExecutionPolicy Bypass -File restore.ps1

$root = $PSScriptRoot
$src = Join-Path $root "_snapshot"
if (-not (Test-Path $src)) {
  Write-Error "Mappen _snapshot mangler. Kan ikke gendanne."
  exit 1
}

$files = @(
  "index.html","produkt.html","research.html","om-os.html","kontakt.html",
  "manifest.webmanifest","robots.txt","sitemap.xml"
)
foreach ($f in $files) {
  Copy-Item (Join-Path $src $f) -Destination (Join-Path $root $f) -Force
}
Copy-Item (Join-Path $src "assets\css\main.css") -Destination (Join-Path $root "assets\css\main.css") -Force
Copy-Item (Join-Path $src "assets\js\main.js") -Destination (Join-Path $root "assets\js\main.js") -Force

$added = @("shop.html","ritual.html","standards.html","artikel.html")
foreach ($f in $added) {
  $p = Join-Path $root $f
  if (Test-Path $p) { Remove-Item $p -Force }
}

Write-Host "Gendannet. Genindlæs http://127.0.0.1:5173/"
