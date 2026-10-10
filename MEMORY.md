# Project Memory

- Project: ccusage-codex-m
- Purpose: Rebuild Codex JSONL usage data and estimate token cost.
- Last updated: 2026-10-10
- Updated by: Codex

## 2026-10-10 Large Log Fix / 大日志读取修复

Codex 2026-10-10：本机一份 JSONL 会话达到 572,891,100 字节，原 `readFileSync(..., 'utf8')` 整文件读取触发 Node 字符串长度上限。现改为 1 MiB 分块读取、UTF-8 跨块解码及逐行解析，仅缓存 `session_meta`、`turn_context` 和 `token_count` 记录供统计和 fork 核对使用；坏行仍忽略，原始日志不修改。

Codex 2026-10-10: A local 572,891,100-byte JSONL session exceeded Node's string length limit when read as one UTF-8 string. Reading now uses 1 MiB chunks, UTF-8 decoding across chunk boundaries, and line-by-line parsing, retaining only `session_meta`, `turn_context`, and `token_count` records for accounting and fork comparison. Malformed lines remain ignored; source logs are unchanged.

验证 / Verification: 原安装入口输出完整日报并以 0 退出；现有 `node test_pricing.js` 价格及 fork 去重检查通过；`git diff --check` 通过。The installed daily launcher completed with exit code 0; existing pricing/fork regression checks and the diff whitespace check passed.

## Pricing

The active pricing table is `ccusage_m_view.js` in `PRICING_PER_M`, expressed in USD per 1M tokens.

## 2026-09-30 Pricing Update / 价格更新

Codex 2026-09-30：新增 `gpt-6.1-sol`（输入 2.0、缓存读取 0.1、缓存写入 2.5、输出 10.0 美元/百万 token），旧 `gpt-6-sol` 仍使用缓存读取 0.2。GPT-5.6 Sol 更新为 4.0、0.4、5.0、20.0，按事件时间保留降价前的 5.0、0.5、6.25、30.0；官方公布降价日期为 2026-08-21，生效时刻假设为该日 UTC 00:00。促销至少持续到 2026-11-21，不预设结束后的价格。`gpt-5.6` 别名共用 Sol 价格历史；订阅统一价格估算规则不变。

Codex 2026-09-30: Added `gpt-6.1-sol` at 2.0 input, 0.1 cached read, 2.5 cache write, and 10.0 output USD per 1M tokens; the older `gpt-6-sol` retains its 0.2 cached-read rate. GPT-5.6 Sol now uses 4.0, 0.4, 5.0, and 20.0, preserving earlier rates of 5.0, 0.5, 6.25, and 30.0 by event timestamp. The official reduction date is 2026-08-21; UTC midnight is the assumed effective time. The promotion lasts at least through 2026-11-21; no subsequent rate is assumed. The `gpt-5.6` alias shares Sol's history; uniform subscription estimates remain in place.

来源 / Sources: https://developers.openai.com/api/docs/pricing and https://developers.openai.com/api/docs/changelog

## 2026-09-23 GPT-6 Pricing Update / GPT-6 价格更新

GPT-6 的 Standard 短上下文价格按每百万 token 计，数字依次为输入、缓存读取、缓存写入、输出。
GPT-6 Standard short-context prices are per 1M tokens, in input, cached read, cache write, and output order.

- `gpt-6-astra`: 10.0, 1.0, 12.5, 50.0
- `gpt-6-sol`: 2.0, 0.2, 2.5, 10.0
- `gpt-6-luna`: 0.1, 0.01, 0.125, 0.5

Codex 订阅估算对 GPT-6 使用统一价格，不应用 API 长上下文加价；运行入口已指向仓库源文件，修改仓库即可生效。
Codex subscription estimates use uniform GPT-6 rates without the API long-context surcharge; the installed launcher loads the repository source directly.
来源 / Source: https://developers.openai.com/api/docs/pricing

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

The installers now place a small launcher at `CODEX_HOME/ccusage_m_view.js` and a `ccusage_m_view.repo` source pointer instead of copying the full accounting script. The launcher loads the repository's `ccusage_m_view.js` through `CCUSAGE_CODEX_REPO` or the pointer file, and the generated PowerShell/Git Bash commands continue to call the launcher. After the initial install, `git pull` updates the code used by the commands; rerun the installer only when the repository path or `CODEX_HOME` changes.

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
