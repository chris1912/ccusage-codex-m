# ccusage-codex-m

一个用于统计 Codex 本地会话用量与费用的脚本与命令集合。  
A local script + shell command snippets for tracking Codex token usage and estimated cost.

## 价格更新 / Pricing Update（2026-09-30）

Codex 2026-09-30：新增 `gpt-6.1-sol`，每百万 token 的输入、缓存读取、缓存写入、输出价格分别为 `$2.00 / $0.10 / $2.50 / $10.00`；原 `gpt-6-sol` 缓存读取价格仍为 `$0.20`。GPT-5.6 Sol 自 2026-08-21 起使用促销价 `$4.00 / $0.40 / $5.00 / $20.00`，之前的事件保留旧价，`gpt-5.6` 别名也使用 Sol 的价格历史。官方只公布降价日期，脚本按 `2026-08-21T00:00:00Z` 配置生效时刻；促销至少持续到 2026-11-21，不预设到期后的价格。订阅估算继续使用统一价格，不应用 API 长上下文加价。

Codex 2026-09-30: Added `gpt-6.1-sol` at `$2.00 / $0.10 / $2.50 / $10.00` per 1M tokens for input, cached reads, cache writes, and output; the original `gpt-6-sol` cached-read rate remains `$0.20`. GPT-5.6 Sol uses promotional rates of `$4.00 / $0.40 / $5.00 / $20.00` from 2026-08-21, preserving earlier event prices; the `gpt-5.6` alias shares Sol's pricing history. Only the date is officially published, so the script assumes `2026-08-21T00:00:00Z` as the effective time. The promotion lasts at least through 2026-11-21; no subsequent rate is assumed. Subscription estimates continue using uniform rates without the API long-context surcharge.

来源 / Sources: [OpenAI Pricing](https://developers.openai.com/api/docs/pricing), [OpenAI Changelog](https://developers.openai.com/api/docs/changelog).

## 重要更新 / Important Update（2026-07-31）

- 修复 fork 子会话复制父历史 `token_count` 导致的重复计费；新增 `stats.forkReplaySuppressed` 统计。
- 调整 GPT-5.6 的 Codex 订阅估算规则，统一使用基础价格，不再应用 API 长上下文加价。
- 新增 `test_pricing.js`，覆盖 GPT-5.6 价格和 fork 历史去重回归检查。
- 改进 PowerShell 5.1 空配置文件处理，以及 Git Bash/WSL 下的 Windows 路径转换。
- 更新终端表格布局：取消单元格额外留白，日期使用 `Mon DD` 短格式，模型名称按行展示，适合窄窗口。
- 更新 GPT-5.6 Terra/Luna 的官方当前价格，并补充缓存写入价格回归测试。
- 增加按 `token_count` 事件时间匹配历史价格的计费逻辑，并在表格最右侧增加 `Notes` 列标注官方价格变更日期。
- 改造安装方式：`CODEX_HOME` 中只保留指向仓库源文件的 launcher，避免本地运行副本与 GitHub 仓库分叉。
- 更新安装说明、迁移说明和 `MEMORY.md`，记录修复依据、展示调整与验证结果。

### Important update summary

- Historical cost is now calculated per `token_count` event timestamp instead of applying today's price to every historical session.
- A session that crosses a price-change boundary can contain charges from both price versions; its total is the sum of event-level charges.
- Daily, monthly, and session tables now end with a `Notes` column that marks `官方价格变更` on the effective local date.
- The effective timestamp is configured explicitly as `2026-07-31T00:00:00Z` and can be revised in the pricing history when an official effective date is confirmed.

## 一句话交给 AI 部署 (复制粘贴即可)

中文：
> 请在 Windows 上帮我部署并配置这个仓库 `https://github.com/chris1912/ccusage-codex-m`：克隆到本地后在仓库根目录运行 `scripts/install.ps1`，让 PowerShell 里可直接使用 `ccusage-codex-m`、`ccusage-codex-monthly`、`ccusage-codex-open` 三个命令；如果已存在旧配置，请先备份再写入。

English:
> On Windows, deploy `https://github.com/chris1912/ccusage-codex-m`: clone it, run `scripts/install.ps1` from the repo root, and make sure PowerShell exposes `ccusage-codex-m`, `ccusage-codex-monthly`, `ccusage-codex-open`. Back up any existing config before editing.

## 30 秒快速安装

### Windows (PowerShell)

```powershell
git clone https://github.com/chris1912/ccusage-codex-m.git
cd ccusage-codex-m

# 如需自定义 Codex 数据目录：
# .\scripts\install.ps1 -CodexHome "D:\path\to\.codex"

powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
. $PROFILE

ccusage-codex-m
ccusage-codex-monthly
ccusage-codex-open
```

说明：
- 安装脚本会在你的 `CODEX_HOME`（默认 `C:\Users\<你>\.codex`）写入一个 launcher，并修改 `$PROFILE` 写入函数定义；launcher 始终加载当前仓库中的 `ccusage_m_view.js`，不会再复制一份独立运行副本。
- 脚本会自动对被修改的文件做 `*.bak-YYYYMMDD_HHMMSS` 备份。
- 首次安装后，进入仓库执行 `git pull` 即可让命令使用新版本；只有仓库移动到新路径时才需要重新运行安装脚本。launcher 会通过 `CCUSAGE_CODEX_REPO` 或 `CODEX_HOME/ccusage_m_view.repo` 找到源仓库。

如果你的环境里 `powershell` 命令不可用，可以改用 `powershell.exe`：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

### Git Bash / WSL (bash/zsh)

```bash
git clone https://github.com/chris1912/ccusage-codex-m.git
cd ccusage-codex-m

# 如需自定义 Codex 数据目录：
# CODEX_HOME="/c/Users/<you>/.codex" bash scripts/install.sh

bash scripts/install.sh
source ~/.bashrc  # 或 ~/.zshrc

ccusage-codex-m
ccusage-codex-monthly
ccusage-codex-open
```

## 中文说明

### 这是什么

本仓库提供一个本地脚本 `ccusage_m_view.js`，用于从你的 Codex 数据目录（默认 `~/.codex`）读取 session 事件（JSONL），重建每日、每月、以及“未归档 session”的用量与计费统计。

它的目标是：
- 输出更易读的表格（模型名紧凑展示、token 以 `M` 单位显示等）
- 统一口径（daily / monthly / sessions 三种统计都走同一套重建与计费逻辑）
- 终端表格默认采用紧凑布局，日期使用短格式、模型名允许分行，减少列宽并适合窄窗口显示

### 功能与默认口径

- `daily`：按天汇总
  - **默认显示最近 20 个自然日（含今天）**
  - 如果显式传入 `--since/--until`，则使用你指定的时间窗
- `monthly`：按月汇总
  - 默认全量（除非你传入 `--since/--until`）
- `sessions`：按 session 汇总
  - 本仓库口径将“打开的 session”定义为：`~/.codex/sessions` 下的 session（**不包含** `~/.codex/archived_sessions`）
  - 默认全量（除非你传入 `--since/--until`）

输出表头（保持一致）：
- 日/月：`Data | Models | Input | Cache | Write | Output | Reason | Total | Cost | Notes`
- session：`Started | Session | Models | Input | Cache | Write | Output | Reason | Total | Cost | Notes`

终端显示说明：
- 日/月统计的日期显示为 `Jul 18` 形式，以减少日期列宽。
- 同一行存在多个模型时，模型名称在 `Models` 列内分行，表格高度会随模型数量增加，但不会额外拉宽其它列。
- `Notes` 列会在价格变更生效日期显示 `官方价格变更`；session 行只要覆盖该日期也会显示该备注。
- 终端字号由 PowerShell、Windows Terminal 或其他终端程序控制；脚本通过减少字符留白和列宽来压缩表格占用空间。

### 依赖

- Node.js >= 20（建议 20.19.4+）
- 你的机器上已有 Codex 数据目录：
  - Windows 默认位置：`C:\Users\<你>\.codex`
  - 其中 `sessions/` 与可选的 `archived_sessions/`

### 快速使用

直接运行脚本：

```bash
node ccusage_m_view.js daily
node ccusage_m_view.js daily --since 2026-05-01 --until 2026-05-14
node ccusage_m_view.js daily --json

node ccusage_m_view.js monthly
node ccusage_m_view.js sessions

# 运行历史价格、Notes、fork 去重和紧凑表格回归检查
node test_pricing.js
```

常用参数：
- `--since YYYY-MM-DD`
- `--until YYYY-MM-DD`
- `--json`
- `--timezone TZ`
- `--locale LOCALE`

### 配置命令（Git Bash / PowerShell）

本仓库提供了可直接粘贴的片段：
- `snippets/gitbash.bashrc.snippet`
- `snippets/powershell.profile.snippet.ps1`

它们会定义 3 个命令：
- `ccusage-codex-m`：默认近 20 日 daily
- `ccusage-codex-monthly`：monthly
- `ccusage-codex-open`：sessions（仅 `~/.codex/sessions`）

安装器会同时设置 `CCUSAGE_CODEX_REPO`，用于让 launcher 找到仓库源文件；如果手动加载 snippets，请先把这个环境变量设为本地仓库根目录。

你也可以用 `apply_changes.ps1` 来把脚本/片段复制到机器的预期位置（根据你自己的路径自行调整）。

### 计费说明

脚本会根据内置的模型价格表计算 Cost。  
`Cache` 表示缓存读取 token，`Write` 表示缓存写入 token；如果 Codex 本地日志未暴露缓存写入字段，`Write` 会显示为 `0.000M`。
Codex 2026-07-16：本工具面向 Codex 订阅用户时，GPT-5.6 按统一价格估算，不应用 API 长上下文加价；其他配置了长上下文价格的模型维持原规则。
2026-07-31：依据 OpenAI 官方模型比较页更新 GPT-5.6 当前标准价格：Sol 为输入 `$5.00`、缓存读取 `$0.50`、输出 `$30.00`；Terra 为输入 `$2.00`、缓存读取 `$0.20`、输出 `$12.00`；Luna 为输入 `$0.20`、缓存读取 `$0.02`、输出 `$1.20`。GPT-5.6 缓存写入按未缓存输入价格的 1.25 倍计费，因此 Terra 写入为 `$2.50`，Luna 写入为 `$0.25`。
2026-09-23：新增 GPT-6 Standard 价格（每百万 token，依次为输入、缓存读取、缓存写入、输出）：Astra `$10.00`、`$1.00`、`$12.50`、`$50.00`；Sol `$2.00`、`$0.20`、`$2.50`、`$10.00`；Luna `$0.10`、`$0.01`、`$0.125`、`$0.50`。Codex 订阅估算沿用统一价格，不应用 API 长上下文加价。来源：<https://developers.openai.com/api/docs/pricing>。
价格来源：<https://developers.openai.com/api/docs/models/compare>。
价格不会用当前值回算所有历史 session：脚本按每条 `token_count` 事件的时间戳选择价格。当前版本将新价格配置为从 `2026-07-31T00:00:00Z` 起生效，旧时间的 Terra/Luna 用此前价格；这是根据本次价格表更新日期设定的可调整生效点。
输出表格最右侧的 `Notes` 会在对应的本地日期标记 `官方价格变更`，用于提醒当天及跨越该日期的 session 费用使用了价格版本切换。
fork 子会话会在新 JSONL 文件开头复制父会话的历史 `token_count` 记录；脚本会通过 `forked_from_id` 和父子累计用量序列识别并跳过这段复制历史，只计入 fork 之后真实产生的调用。`--json` 输出中的 `stats.forkReplaySuppressed` 表示跳过的复制记录数。
注意：价格表可能会随时间变化，建议你定期更新价格数据或在脚本里维护你自己的价格表。

### 历史价格计费规则（重要）

价格计算以每条有效的 `token_count` 事件为单位，而不是以 session 的创建日期或开始日期为单位。脚本会读取事件时间戳，选择该时间点适用的模型价格，再分别计算未缓存输入、缓存读取、缓存写入和输出费用，最后把所有事件费用相加。

因此，若一个 session 从价格变更前持续到价格变更后，session 总费用会自然包含两个价格版本：变更前产生的 token 使用旧价格，变更后产生的 token 使用新价格。历史 JSONL 不需要迁移或重写，重新运行脚本即可按事件时间重新计算。

当前价格历史配置如下（每 1M token，美元）：

| 生效时间 | Terra | Luna | 说明 |
| --- | --- | --- | --- |
| `2026-07-31T00:00:00Z` 之前 | 输入 `$2.50`、缓存 `$0.25`、写入 `$3.125`、输出 `$15.00` | 输入 `$1.00`、缓存 `$0.10`、写入 `$1.25`、输出 `$6.00` | 历史价格 |
| `2026-07-31T00:00:00Z` 起 | 输入 `$2.00`、缓存 `$0.20`、写入 `$2.50`、输出 `$12.00` | 输入 `$0.20`、缓存 `$0.02`、写入 `$0.25`、输出 `$1.20` | 当前价格 |

Sol 的当前价格与历史配置一致，其他模型继续使用原有价格规则。上表中的生效时间是当前仓库的明确配置假设，不等同于官方页面自动提供的历史版本时间；如果官方后续确认了不同生效时刻，应调整 `ccusage_m_view.js` 中的 `PRICING_HISTORY` 和 `PRICING_CHANGE_EVENTS`。

`Notes` 使用命令行的 `--timezone` 将生效时间转换为本地日期：daily/monthly 行在对应日期显示 `官方价格变更`，session 行只要包含该日期的有效事件也会显示该备注，Totals 行使用 `-`。JSON 输出中的每个汇总行也会保留 `notes` 字段。

#### fork 修复验证

在本机 2026-07-17 对同一份 `~/.codex/sessions` 快照做前后对比：

| 日期 | 修复前 | 修复后 | 去掉的复制历史费用 |
| --- | ---: | ---: | ---: |
| 2026-07-14 | `$159.818869` | `$97.458398` | `$62.360471` |
| 2026-07-15 | `$129.861799` | `$74.847920` | `$55.013879` |
| 2026-07-16 | `$487.875700` | `$154.618444` | `$333.257256` |
| 2026-07-17 | `$105.851193` | `$9.960284` | `$95.890908` |

因此 7 月 16 日的高额中约 68.3% 是 fork 历史复制造成的；修复后的 `$154.618444` 仍是当天真实新增调用，不能再从父历史中扣除。

#### 移植到其他电脑

本工具只依赖 Node.js（建议 20.19.4 或更高版本），不依赖本机用户名或固定路径。将仓库复制到目标电脑后执行：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\install.ps1 -CodexHome "$HOME\.codex" -Force
. $PROFILE
ccusage-codex-m --json
node test_pricing.js
```

如果 Codex 数据目录不是默认位置，替换 `-CodexHome`；Git Bash/WSL 使用 `CODEX_HOME="/path/to/.codex" bash scripts/install.sh`。首次安装后更新仓库代码不需要再次复制脚本，安装器会自动备份旧入口和 shell 配置；如果仓库移动到新路径，再重新运行安装命令即可。

## English

### What is this?

This repo contains a local Node.js script (`ccusage_m_view.js`) that rebuilds Codex usage accounting from local Codex session JSONL logs (default data dir: `~/.codex`) and prints daily/monthly/session aggregates with estimated cost.

### Modes and defaults

- `daily`
  - **Defaults to the most recent 20 calendar days (including today)** when `--since/--until` is not provided.
- `monthly`
  - Full-range by default unless you pass filters.
- `sessions`
  - “Open sessions” is defined as sessions under `~/.codex/sessions` only (does not include `archived_sessions`).
  - Full-range by default unless you pass filters.

Output headers:
- Daily/monthly: `Data | Models | Input | Cache | Write | Output | Reason | Total | Cost | Notes`
- Sessions: `Started | Session | Models | Input | Cache | Write | Output | Reason | Total | Cost | Notes`

### Requirements

- Node.js >= 20 (20.19.4+ recommended)
- Local Codex data directory available at `~/.codex`

### Usage

```bash
node ccusage_m_view.js daily
node ccusage_m_view.js daily --since 2026-05-01 --until 2026-05-14
node ccusage_m_view.js daily --json

node ccusage_m_view.js monthly
node ccusage_m_view.js sessions
```

### Shell commands

Ready-to-paste snippets:
- `snippets/gitbash.bashrc.snippet`
- `snippets/powershell.profile.snippet.ps1`

They define:
- `ccusage-codex-m` (daily, last 20 days by default)
- `ccusage-codex-monthly`
- `ccusage-codex-open` (sessions under `~/.codex/sessions`)

The installer also sets `CCUSAGE_CODEX_REPO`, which lets the launcher locate the repository source. If you load a snippet manually, set this variable to the local repository root first.

### Quick install scripts

- Windows PowerShell: `scripts/install.ps1`
- bash/zsh (Git Bash/WSL): `scripts/install.sh`

Both installers:
- Install a small launcher into `CODEX_HOME` (default: `~/.codex`) that always loads the repository's `ccusage_m_view.js`
- Append a marked block to your shell profile, with timestamped backups
- Keep the repository as the single source of truth, so pulling new commits updates the commands without copying another script

### Pricing note

Cost is computed using an internal price table. Prices can change; keep your table updated if you rely on cost accuracy.
`Cache` means cached-input reads, and `Write` means cache writes. If local Codex logs do not expose cache-write fields, `Write` is shown as `0.000M`.
As of 2026-07-31, the current GPT-5.6 standard prices are: Sol `$5.00` input, `$0.50` cached input, `$30.00` output; Terra `$2.00`, `$0.20`, `$12.00`; Luna `$0.20`, `$0.02`, `$1.20`. GPT-5.6 cache writes are billed at 1.25x the uncached input price, so Terra writes cost `$2.50` and Luna writes cost `$0.25` per 1M tokens. Source: <https://developers.openai.com/api/docs/models/compare>.
As of 2026-09-23, GPT-6 Standard prices per 1M tokens (input, cached read, cache write, output) are: Astra `$10.00`, `$1.00`, `$12.50`, `$50.00`; Sol `$2.00`, `$0.20`, `$2.50`, `$10.00`; Luna `$0.10`, `$0.01`, `$0.125`, `$0.50`. Codex subscription estimates use these uniform rates without the API long-context surcharge. Source: <https://developers.openai.com/api/docs/pricing>.
Prices are selected per `token_count` event timestamp, so historical Terra/Luna usage keeps the earlier price instead of being recalculated with today's price. This version assumes the updated prices became effective at `2026-07-31T00:00:00Z`; adjust that explicit effective timestamp when an official effective date is known.

### Historical pricing calculation (important)

Pricing is resolved for each valid `token_count` event, not for the session's creation or start date. The script uses the event timestamp to select the applicable model price, calculates uncached input, cached reads, cache writes, and output separately, then sums the event-level charges.

If one session crosses a pricing boundary, its total can legitimately contain both price versions: events before the boundary use the historical price, and events after the boundary use the current price. Existing JSONL files do not need to be migrated or rewritten; rerunning the script recalculates them from their event timestamps.

The configured Terra/Luna history is shown below in USD per 1M tokens:

| Effective time | Terra | Luna | Meaning |
| --- | --- | --- | --- |
| Before `2026-07-31T00:00:00Z` | Input `$2.50`, cached `$0.25`, write `$3.125`, output `$15.00` | Input `$1.00`, cached `$0.10`, write `$1.25`, output `$6.00` | Historical price |
| From `2026-07-31T00:00:00Z` | Input `$2.00`, cached `$0.20`, write `$2.50`, output `$12.00` | Input `$0.20`, cached `$0.02`, write `$0.25`, output `$1.20` | Current price |

At the 2026-07-31 update, Sol's price was unchanged. The 2026-09-30 update above adds Sol's 2026-08-21 promotional pricing history.

The repository currently assumes `2026-07-31T00:00:00Z` as the effective timestamp for the latest Terra/Luna prices. This is an explicit configuration assumption rather than an automatically versioned historical record; update `PRICING_HISTORY` and `PRICING_CHANGE_EVENTS` if an official effective timestamp is confirmed.

### Single source of truth

The installers do not keep a second full copy of the accounting script. They place a small launcher and a source pointer file in `CODEX_HOME`; the launcher loads the repository file from `CCUSAGE_CODEX_REPO` or that pointer file. After the initial installation, use `git pull` in the repository and the installed commands will immediately use the pulled code. Re-run the installer only after moving the repository or changing `CODEX_HOME`.

The `Notes` value is converted to the local date selected by `--timezone`. Daily and monthly rows show `官方价格变更` on the effective date, session rows show it when they contain a counted event on that date, Totals rows show `-`, and JSON summary rows expose the aggregated `notes` field.

### Terminal display

Daily and monthly dates use the compact `Mon DD` format. Multiple model names are rendered on separate lines inside the `Models` column, allowing the table to grow vertically without unnecessarily widening the terminal output. The rightmost `Notes` column marks `官方价格变更` on the effective local date, and session rows show it when they cover that date. Cell padding and common column caps are reduced for narrow panes. JSON output and accounting behavior are unchanged.

