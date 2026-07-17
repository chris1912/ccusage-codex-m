# Project Memory

- Project: ccusage-codex-m
- Purpose: Rebuild Codex JSONL usage data and estimate token cost.
- Last updated: 2026-07-17
- Updated by: Codex

## Pricing

The active pricing table is `ccusage_m_view.js` in `PRICING_PER_M`, expressed in USD per 1M tokens.

On 2026-07-10, the GPT-5.6 preview family was added from OpenAI's June 26, 2026 announcement (https://openai.com/index/previewing-gpt-5-6-sol/):

- `gpt-5.6-sol`: input 5.0, cached-input read 0.5, cache write 6.25, output 30.0
- `gpt-5.6-terra`: input 2.5, cached-input read 0.25, cache write 3.125, output 15.0
- `gpt-5.6-luna`: input 1.0, cached-input read 0.1, cache write 1.25, output 6.0

Codex 2026-07-16：按主人要求，本工具定位为 Codex 订阅用户的本地金额估算，不采用 API 长上下文加价。GPT-5.6 对所有请求使用统一价格；GPT-5.4 和 GPT-5.5 的既有配置保持不变。

2026-07-12 的固定会话快照比较结果保留作为回归依据：带长上下文加价时合计 `$123.617830`，统一价格时合计 `$96.983890`，减少 `$26.633939`（`21.55%`）。

Codex 2026-07-17：确认 fork 重复计费根因。Codex 会在 fork 子 JSONL 开头复制父会话的 `token_count` 历史，并重写这些复制记录的时间戳；仅按时间戳或文件去重无法识别。`ccusage_m_view.js` 现在使用 `forked_from_id` 找到父文件，按父子原始累计用量序列识别复制前缀，处理复制记录但不生成费用事件，再从复制后的累计值继续计算分支增量。`stats.forkReplaySuppressed` 记录被跳过的复制事件数。实机样本中，fork 子会话原显示 `$78.534416`，其中 `$59.020243` 是复制的父历史；修复后该子会话只计 `$19.514173`。

同一份本机快照的前后对比显示：2026-07-16 从 `$487.875700` 修正为 `$154.618444`，减少 `$333.257256`（约 `68.3%`）；修复后剩余金额是分支真实新增调用，不再重复扣除父历史。

Codex 2026-07-10: the script supports `cacheWriteInputTokens` and prices GPT-5.6 cache writes separately when the log source exposes `cache_write_input_tokens`, `cache_creation_input_tokens`, or `cache_write_tokens`. Current Codex local `token_count` logs do not expose cache-write token counts, so runtime output usually shows `Write` as `0.000M`.

## Verification

- Syntax check: `node --check ccusage_m_view.js`

## 2026-07-10 Codex Troubleshooting Note

The PowerShell command family runs `C:\Users\shuis\.codex\ccusage_m_view.js`, not the repository copy directly. After adding GPT-5.6 pricing to the repo copy, the installed runtime copy must also be synced or reinstalled with `scripts/install.ps1`.

On 2026-07-10, Codex backed up the stale installed copy as `C:\Users\shuis\.codex\ccusage_m_view.js.bak-20260710-164044` and synced the updated repo script into `C:\Users\shuis\.codex\ccusage_m_view.js`.
