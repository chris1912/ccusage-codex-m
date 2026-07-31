$ccusageCodexRepo = $env:CCUSAGE_CODEX_REPO
if ([string]::IsNullOrWhiteSpace($ccusageCodexRepo) -or -not (Test-Path -LiteralPath (Join-Path $ccusageCodexRepo "ccusage_m_view.js"))) {
    throw "Set CCUSAGE_CODEX_REPO to the local ccusage-codex-m repository before loading this snippet."
}

$env:CCUSAGE_CODEX_REPO = $ccusageCodexRepo

function ccusage-codex-m {
    node (Join-Path $ccusageCodexRepo "ccusage_m_view.js") daily @args
}

function ccusage-codex-monthly {
    node (Join-Path $ccusageCodexRepo "ccusage_m_view.js") monthly @args
}

function ccusage-codex-open {
    node (Join-Path $ccusageCodexRepo "ccusage_m_view.js") sessions @args
}
