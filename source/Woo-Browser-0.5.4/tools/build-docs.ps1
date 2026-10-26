$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Compress-Archive -Path (Join-Path $root 'src\ai-docs\*') -DestinationPath (Join-Path $root 'src\ai-docs.zip') -Force
