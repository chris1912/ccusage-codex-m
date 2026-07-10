# Project Memory

- Project: ccusage-codex-m
- Purpose: Rebuild Codex JSONL usage data and estimate token cost.
- Last updated: 2026-07-10
- Updated by: Codex

## Pricing

The active pricing table is `ccusage_m_view.js` in `PRICING_PER_M`, expressed in USD per 1M tokens.

On 2026-07-10, the GPT-5.6 preview family was added from OpenAI's June 26, 2026 announcement (https://openai.com/index/previewing-gpt-5-6-sol/):

- `gpt-5.6-sol`: input 5.0, cached-input read 0.5, output 30.0
- `gpt-5.6-terra`: input 2.5, cached-input read 0.25, output 15.0
- `gpt-5.6-luna`: input 1.0, cached-input read 0.1, output 6.0

The script currently receives cached-input token counts and prices them as cache reads. GPT-5.6 cache writes are billed separately by OpenAI at 1.25x uncached input, but this usage reconstruction does not expose cache-write counts.

## Verification

- Syntax check: `node --check ccusage_m_view.js`

## 2026-07-10 Codex Troubleshooting Note

The PowerShell command family runs `C:\Users\shuis\.codex\ccusage_m_view.js`, not the repository copy directly. After adding GPT-5.6 pricing to the repo copy, the installed runtime copy must also be synced or reinstalled with `scripts/install.ps1`.

On 2026-07-10, Codex backed up the stale installed copy as `C:\Users\shuis\.codex\ccusage_m_view.js.bak-20260710-164044` and synced the updated repo script into `C:\Users\shuis\.codex\ccusage_m_view.js`.
