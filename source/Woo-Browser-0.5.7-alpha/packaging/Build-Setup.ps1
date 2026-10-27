param(
  [Parameter(Mandatory)][string]$PayloadDir,
  [Parameter(Mandatory)][ValidatePattern('^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$')][string]$ReleaseVersion,
  [Parameter(Mandatory)][ValidatePattern('^\d+\.\d+\.\d+\.\d+$')][string]$NumericVersion,
  [Parameter(Mandatory)][string]$OutputDir,
  [string]$CompilerPath,
  [switch]$ValidateOnly,
  [switch]$Fixture
)
$ErrorActionPreference = 'Stop'
$payload = (Resolve-Path -LiteralPath $PayloadDir).Path
$output = [IO.Path]::GetFullPath($OutputDir)
if ($output.TrimEnd('\').StartsWith($payload.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or $output -eq $payload) { throw 'Output must be outside payload.' }
if ($payload.Contains('"') -or $output.Contains('"')) { throw 'Quotes in paths are unsupported.' }
if ($Fixture -and !$ValidateOnly) { throw 'Fixture mode permits validation only; no executable installer.' }
$items = @(Get-ChildItem -LiteralPath $payload -Recurse -Force)
if ($items | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) { throw 'Payload may not contain links or junctions.' }
if ($items | Where-Object { $_.Name -match '^(\.git|\.env.*|node_modules|Cookies|History|Preferences|Local State|user-data|profile)$' }) { throw 'Review unexpected source/dependency/profile/secret payload entries.' }
foreach ($relative in @('Woo.exe','resources\app\package.json','WOO-LICENSE.txt','LICENSE','LICENSES.chromium.html','THIRD-PARTY-NOTICES.md')) {
  if (!(Test-Path -LiteralPath (Join-Path $payload $relative) -PathType Leaf)) { throw "Missing payload file: $relative" }
}
$package = Get-Content -LiteralPath (Join-Path $payload 'resources\app\package.json') -Raw | ConvertFrom-Json
if ($package.version -ne $ReleaseVersion) { throw 'Payload package version differs from requested release.' }
if (!$Fixture) {
  $bytes = [IO.File]::ReadAllBytes((Join-Path $payload 'Woo.exe'))
  if ($bytes.Length -lt 64 -or $bytes[0] -ne 77 -or $bytes[1] -ne 90) { throw 'Woo.exe has no DOS executable header.' }
  $pe = [BitConverter]::ToInt32($bytes,60)
  if ($pe -lt 0 -or $pe + 6 -gt $bytes.Length -or [BitConverter]::ToUInt32($bytes,$pe) -ne 17744 -or [BitConverter]::ToUInt16($bytes,$pe+4) -ne 34404) { throw 'Woo.exe is not an x64 PE file.' }
  if ((Get-Item -LiteralPath (Join-Path $payload 'Woo.exe')).VersionInfo.FileVersion -ne $NumericVersion) { throw 'Woo.exe file version differs from requested numeric version.' }
}
if (Test-Path -LiteralPath $output) { throw 'Choose a fresh output directory to avoid mixing builds.' }
New-Item -ItemType Directory -Path $output | Out-Null
$manifest = @($items | Where-Object { !$_.PSIsContainer } | Sort-Object FullName | ForEach-Object {
  [ordered]@{ path=$_.FullName.Substring($payload.Length+1); bytes=$_.Length; sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
})
[ordered]@{ releaseVersion=$ReleaseVersion; numericVersion=$NumericVersion; fixture=[bool]$Fixture; files=$manifest } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $output 'payload-manifest.json') -Encoding utf8
if ($ValidateOnly) { Write-Output "Validated $($manifest.Count) files; no installer compiled or executed."; return }
if (!$CompilerPath) { throw 'Supply approved Inno Setup 7.1.0 ISCC.exe explicitly.' }
$compiler = Get-Item -LiteralPath $CompilerPath
$signature = Get-AuthenticodeSignature -LiteralPath $compiler.FullName
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'CN=Pyrsys B.V.') { throw 'Compiler publisher signature must be valid.' }
$compilerVersion = & $compiler.FullName --version
if ($LASTEXITCODE -ne 0 -or $compilerVersion.Trim() -ne '7.1.0') { throw 'Compiler must be pinned Inno Setup 7.1.0.' }
& $compiler.FullName "/DPayloadDir=$payload" "/DReleaseVersion=$ReleaseVersion" "/DNumericVersion=$NumericVersion" "/DOutputDir=$output" (Join-Path $PSScriptRoot 'woo.iss')
if ($LASTEXITCODE -ne 0) { throw 'Inno Setup compilation failed.' }
$setup = Join-Path $output "Woo-$ReleaseVersion-Windows-x64-Setup.exe"
Get-FileHash -LiteralPath $setup -Algorithm SHA256 | Format-List | Out-String | Set-Content -LiteralPath (Join-Path $output 'setup-sha256.txt')
Write-Output "Compiled unsigned review artifact: $setup. Installer was not executed."
