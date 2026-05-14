$ErrorActionPreference = "Stop"

$sourceRoot = "D:\AIAgent\patched_ccusage_cmds"
$targets = @(
    @{ Source = Join-Path $sourceRoot "ccusage_m_view.js"; Target = "C:\Users\shuis\.codex\ccusage_m_view.js" },
    @{ Source = Join-Path $sourceRoot ".bashrc"; Target = "D:\software\Cadence\SPB_Data\.bashrc" },
    @{ Source = Join-Path $sourceRoot "Microsoft.PowerShell_profile.ps1"; Target = "C:\Users\shuis\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1" }
)

foreach ($item in $targets) {
    if (-not (Test-Path $item.Source)) {
        throw "Missing source file: $($item.Source)"
    }
    $targetDir = Split-Path -Parent $item.Target
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    Copy-Item -Path $item.Source -Destination $item.Target -Force
}

Write-Output "Applied patched files to target locations."
