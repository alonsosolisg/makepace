param([switch]$Smoke)
$ErrorActionPreference = 'Stop'
# This disposable native build mirror avoids mixing Linux/Windows node_modules.
$source = Split-Path $PSScriptRoot -Parent
$target = Join-Path $env:LOCALAPPDATA 'MakePace\development'
New-Item -ItemType Directory -Force -Path $target | Out-Null
foreach ($file in @('package.json','package-lock.json')) {
    Copy-Item (Join-Path $source $file) (Join-Path $target $file) -Force
}
foreach ($folder in @('desktop','scripts','landing')) {
    & robocopy (Join-Path $source $folder) (Join-Path $target $folder) /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "Could not copy $folder into the Windows build folder." }
}
Push-Location $target
try {
    $hash = (Get-FileHash 'package-lock.json' -Algorithm SHA256).Hash
    $stamp = Join-Path $target '.installed-lock'
    if (!(Test-Path 'node_modules\electron\dist\electron.exe') -or !(Test-Path $stamp) -or (Get-Content $stamp -Raw).Trim() -ne $hash) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Windows dependency installation failed.' }
        Set-Content $stamp $hash
    }
    if ($Smoke) {
        $env:MAKEPACE_DESKTOP_USER_DATA = Join-Path $env:TEMP 'makepace-native-smoke'
        $env:MAKEPACE_DESKTOP_SMOKE = Join-Path $env:TEMP 'makepace-native-evidence'
    }
    & npm.cmd run desktop
    if ($LASTEXITCODE -ne 0) { throw 'MakePace desktop exited with an error.' }
} finally { Pop-Location }
