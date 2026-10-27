$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
& node (Join-Path $root 'tools/generate-capabilities.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Capability generation failed' }
Compress-Archive -Path (Join-Path $root 'src\ai-docs\*') -DestinationPath (Join-Path $root 'src\ai-docs.zip') -Force
