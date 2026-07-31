# Project Memory

- Project: ccusage-codex-m
- Purpose: Rebuild Codex JSONL usage data and estimate token cost.
- Last updated: 2026-07-31
- Updated by: Codex

## Pricing

The active pricing table is `ccusage_m_view.js` in `PRICING_PER_M`, expressed in USD per 1M tokens.

On 2026-07-10, the GPT-5.6 preview family was added from OpenAI's June 26, 2026 announcement (https://openai.com/index/previewing-gpt-5-6-sol/). The following values are retained as the historical baseline for events before the current pricing update:

- `gpt-5.6-sol`: input 5.0, cached-input read 0.5, cache write 6.25, output 30.0
- `gpt-5.6-terra`: input 2.5, cached-input read 0.25, cache write 3.125, output 15.0
- `gpt-5.6-luna`: input 1.0, cached-input read 0.1, cache write 1.25, output 6.0

## 2026-07-31 Codex Pricing Update

OpenAI's current model comparison page lists the following updated standard prices per 1M tokens:

- `gpt-5.6-sol`: input 5.0, cached-input read 0.5, cache write 6.25, output 30.0 (unchanged)
- `gpt-5.6-terra`: input 2.0, cached-input read 0.2, cache write 2.5, output 12.0
- `gpt-5.6-luna`: input 0.2, cached-input read 0.02, cache write 0.25, output 1.2

The GPT-5.5, GPT-5.4, and other legacy GPT-5 entries remain unchanged. GPT-5.6 cache writes use 1.25x the uncached input rate. Source: https://developers.openai.com/api/docs/models/compare

## 2026-07-31 Historical Pricing and Notes

`PRICING_HISTORY` in `ccusage_m_view.js` selects the price version from each `token_count` event timestamp, so older Terra/Luna sessions are not recomputed with the latest price. The current implementation assumes the updated prices became effective at `2026-07-31T00:00:00Z`; this is an explicit configuration point to revise if OpenAI publishes a different effective timestamp.

`PRICING_CHANGE_EVENTS` feeds the rightmost `Notes` column. Daily and monthly rows show `官方价格变更` on the effective local date, while a session row shows it if any counted event in that session falls on that date. JSON rows also expose the aggregated `notes` value.

## 2026-07-31 Single Source of Truth Installation

The installers now place a small launcher at `CODEX_HOME/ccusage_m_view.js` instead of copying the full accounting script. The launcher loads the repository's `ccusage_m_view.js` through the generated `CCUSAGE_CODEX_REPO` environment variable, and the generated PowerShell/Git Bash commands continue to call the launcher. After the initial install, `git pull` updates the code used by the commands; rerun the installer only when the repository path or `CODEX_HOME` changes.

Codex 2026-07-16：按主人要求，本工具定位为 Codex 订阅用户的本地金额估算，不采用 API 长上下文加价。GPT-5.6 对所有请求使用统一价格；GPT-5.4 和 GPT-5.5 的既有配置保持不变。

2026-07-12 的固定会话快照比较结果保留作为回归依据：带长上下文加价时合计 `$123.617830`，统一价格时合计 `$96.983890`，减少 `$26.633939`（`21.55%`）。

Codex 2026-07-17：确认 fork 重复计费根因。Codex 会在 fork 子 JSONL 开头复制父会话的 `token_count` 历史，并重写这些复制记录的时间戳；仅按时间戳或文件去重无法识别。`ccusage_m_view.js` 现在使用 `forked_from_id` 找到父文件，按父子原始累计用量序列识别复制前缀，处理复制记录但不生成费用事件，再从复制后的累计值继续计算分支增量。`stats.forkReplaySuppressed` 记录被跳过的复制事件数。实机样本中，fork 子会话原显示 `$78.534416`，其中 `$59.020243` 是复制的父历史；修复后该子会话只计 `$19.514173`。

同一份本机快照的前后对比显示：2026-07-16 从 `$487.875700` 修正为 `$154.618444`，减少 `$333.257256`（约 `68.3%`）；修复后剩余金额是分支真实新增调用，不再重复扣除父历史。

Codex 2026-07-10: the script supports `cacheWriteInputTokens` and prices GPT-5.6 cache writes separately when the log source exposes `cache_write_input_tokens`, `cache_creation_input_tokens`, or `cache_write_tokens`. Current Codex local `token_count` logs do not expose cache-write token counts, so runtime output usually shows `Write` as `0.000M`.

## Verification

- Syntax check: `node --check ccusage_m_view.js`
- Regression check: `node test_pricing.js`

## 2026-07-10 Codex Troubleshooting Note

The PowerShell command family runs `C:\Users\shuis\.codex\ccusage_m_view.js`, not the repository copy directly. After adding GPT-5.6 pricing to the repo copy, the installed runtime copy must also be synced or reinstalled with `scripts/install.ps1`.

On 2026-07-10, Codex backed up the stale installed copy as `C:\Users\shuis\.codex\ccusage_m_view.js.bak-20260710-164044` and synced the updated repo script into `C:\Users\shuis\.codex\ccusage_m_view.js`.

## 2026-07-18 Codex Display Update

- The terminal table renderer now uses zero cell padding, narrower numeric/model caps, short `Mon DD` daily dates, and newline-separated model names so narrow panes stay compact without making model names unreadable.
- The renderer adds a rightmost `Notes` column for pricing-change reminders; historical pricing selection is based on each token event timestamp.
- Terminal font size remains controlled by the terminal application itself; the script reduces the rendered character footprint and row height where possible.
