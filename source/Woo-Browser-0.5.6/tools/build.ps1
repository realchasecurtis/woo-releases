param([string]$Output = (Join-Path $PSScriptRoot '..\staging\Woo-0.5.6-Windows-x64'), [switch]$MetadataOnly)
$ErrorActionPreference = 'Stop'
# MetadataOnly remains accepted for older scripts; branding assets are now integrated.
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$zip = Join-Path $root 'downloads\electron-v45.0.0-win32-x64.zip'
$expected = 'ae53887a23bb640369c93dbd38c408a2af5c0deb86f2fa76c6c244cb444b7f47'
if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'Electron runtime checksum mismatch.' }
if (Test-Path -LiteralPath $Output) { throw 'Choose a fresh output directory.' }
New-Item -ItemType Directory -Path $Output -Force | Out-Null
Expand-Archive -LiteralPath $zip -DestinationPath $Output
Rename-Item -LiteralPath (Join-Path $Output 'electron.exe') -NewName 'Woo.exe'
$resourceEditor = Join-Path $root 'downloads\rcedit-x64-v2.0.0.exe'
$editorHash = '3e7801db1a5edbec91b49a24a094aad776cb4515488ea5a4ca2289c400eade2a'
if ((Get-FileHash -LiteralPath $resourceEditor -Algorithm SHA256).Hash.ToLowerInvariant() -ne $editorHash) { throw 'Resource editor checksum mismatch.' }
$exe = Join-Path $Output 'Woo.exe'
& $resourceEditor $exe --set-version-string ProductName Woo --set-version-string FileDescription Woo --set-version-string InternalName Woo --set-version-string OriginalFilename Woo.exe --set-version-string CompanyName 'Woo contributors' --set-version-string LegalCopyright 'Copyright (c) 2026 Woo contributors. Electron and third-party components retain their respective licenses.' --set-icon (Join-Path $root 'src\assets\woo.ico') --set-file-version 0.5.6.0 --set-product-version 0.5.6.0
if ($LASTEXITCODE -ne 0) { throw 'Executable metadata update failed.' }
'Woo 0.5.6 local preview. User-supplied shared SVG logo/icon integrated. Unsigned prototype; public registration and lasting identities are not activated.' | Set-Content -LiteralPath (Join-Path $Output 'PREVIEW-STATUS.txt')
$app = Join-Path $Output 'resources\app'
New-Item -ItemType Directory -Path $app -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'package.json') -Destination $app
foreach ($folder in @('src','test','sdk','examples')) { Copy-Item -LiteralPath (Join-Path $root $folder) -Destination $app -Recurse }
Copy-Item -LiteralPath (Join-Path $root 'docs') -Destination $Output -Recurse
foreach ($file in @('README.md','SECURITY.md','THIRD-PARTY-NOTICES.md','TEST-REPORT.md')) { if(Test-Path -LiteralPath (Join-Path $root $file)) { Copy-Item -LiteralPath (Join-Path $root $file) -Destination $Output } }
Copy-Item -LiteralPath (Join-Path $root 'LICENSE') -Destination (Join-Path $Output 'WOO-LICENSE.txt')
Write-Output "Built $Output"




