# Project Memory

- Project: ccusage-codex-m
- Purpose: Rebuild Codex JSONL usage data and estimate token cost.
- Last updated: 2026-07-10
- Updated by: Codex

## Pricing

The active pricing table is `ccusage_m_view.js` in `PRICING_PER_M`, expressed in USD per 1M tokens.

On 2026-07-10, the GPT-5.6 preview family was added from OpenAI's June 26, 2026 announcement (https://openai.com/index/previewing-gpt-5-6-sol/):

- `gpt-5.6-sol`: input 5.0, cached-input read 0.5, cache write 6.25, output 30.0; long-context input 10.0, cached-input read 1.0, cache write 12.5, output 45.0
- `gpt-5.6-terra`: input 2.5, cached-input read 0.25, cache write 3.125, output 15.0; long-context input 5.0, cached-input read 0.5, cache write 6.25, output 22.5
- `gpt-5.6-luna`: input 1.0, cached-input read 0.1, cache write 1.25, output 6.0; long-context input 2.0, cached-input read 0.2, cache write 2.5, output 9.0

Codex 2026-07-10: the script supports `cacheWriteInputTokens` and prices GPT-5.6 cache writes separately when the log source exposes `cache_write_input_tokens`, `cache_creation_input_tokens`, or `cache_write_tokens`. Current Codex local `token_count` logs do not expose cache-write token counts, so runtime output usually shows `Write` as `0.000M`.

## Verification

- Syntax check: `node --check ccusage_m_view.js`

## 2026-07-10 Codex Troubleshooting Note

The PowerShell command family runs `C:\Users\shuis\.codex\ccusage_m_view.js`, not the repository copy directly. After adding GPT-5.6 pricing to the repo copy, the installed runtime copy must also be synced or reinstalled with `scripts/install.ps1`.

On 2026-07-10, Codex backed up the stale installed copy as `C:\Users\shuis\.codex\ccusage_m_view.js.bak-20260710-164044` and synced the updated repo script into `C:\Users\shuis\.codex\ccusage_m_view.js`.
