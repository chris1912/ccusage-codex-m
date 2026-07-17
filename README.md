# ccusage-codex-m

一个用于统计 Codex 本地会话用量与费用的脚本与命令集合。  
A local script + shell command snippets for tracking Codex token usage and estimated cost.

## 本次更新（2026-07-18）

- 修复 fork 子会话复制父历史 `token_count` 导致的重复计费；新增 `stats.forkReplaySuppressed` 统计。
- 调整 GPT-5.6 的 Codex 订阅估算规则，统一使用基础价格，不再应用 API 长上下文加价。
- 新增 `test_pricing.js`，覆盖 GPT-5.6 价格和 fork 历史去重回归检查。
- 改进 PowerShell 5.1 空配置文件处理，以及 Git Bash/WSL 下的 Windows 路径转换。
- 更新终端表格布局：取消单元格额外留白，日期使用 `Mon DD` 短格式，模型名称按行展示，适合窄窗口。
- 更新安装说明、迁移说明和 `MEMORY.md`，记录修复依据、展示调整与验证结果。

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
- 安装脚本会把 `ccusage_m_view.js` 复制到你的 `CODEX_HOME`（默认 `C:\Users\<你>\.codex`），并修改 `$PROFILE` 写入函数定义。
- 脚本会自动对被修改的文件做 `*.bak-YYYYMMDD_HHMMSS` 备份。

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
- 日/月：`Data | Models | Input | Cache | Write | Output | Reason | Total | Cost`
- session：`Started | Session | Models | Input | Cache | Write | Output | Reason | Total | Cost`

终端显示说明：
- 日/月统计的日期显示为 `Jul 18` 形式，以减少日期列宽。
- 同一行存在多个模型时，模型名称在 `Models` 列内分行，表格高度会随模型数量增加，但不会额外拉宽其它列。
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

# 运行价格、fork 去重和紧凑表格回归检查
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

你也可以用 `apply_changes.ps1` 来把脚本/片段复制到机器的预期位置（根据你自己的路径自行调整）。

### 计费说明

脚本会根据内置的模型价格表计算 Cost。  
`Cache` 表示缓存读取 token，`Write` 表示缓存写入 token；如果 Codex 本地日志未暴露缓存写入字段，`Write` 会显示为 `0.000M`。
Codex 2026-07-16：本工具面向 Codex 订阅用户时，GPT-5.6 按统一价格估算，不应用 API 长上下文加价；其他配置了长上下文价格的模型维持原规则。
fork 子会话会在新 JSONL 文件开头复制父会话的历史 `token_count` 记录；脚本会通过 `forked_from_id` 和父子累计用量序列识别并跳过这段复制历史，只计入 fork 之后真实产生的调用。`--json` 输出中的 `stats.forkReplaySuppressed` 表示跳过的复制记录数。
注意：价格表可能会随时间变化，建议你定期更新价格数据或在脚本里维护你自己的价格表。

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

如果 Codex 数据目录不是默认位置，替换 `-CodexHome`；Git Bash/WSL 使用 `CODEX_HOME="/path/to/.codex" bash scripts/install.sh`。更新代码后重新运行安装命令即可同步运行时脚本，安装器会自动备份旧脚本和 shell 配置。

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

### Quick install scripts

- Windows PowerShell: `scripts/install.ps1`
- bash/zsh (Git Bash/WSL): `scripts/install.sh`

Both installers:
- Copy `ccusage_m_view.js` into your `CODEX_HOME` (default: `~/.codex`)
- Append a marked block to your shell profile, with timestamped backups

### Pricing note

Cost is computed using an internal price table. Prices can change; keep your table updated if you rely on cost accuracy.
`Cache` means cached-input reads, and `Write` means cache writes. If local Codex logs do not expose cache-write fields, `Write` is shown as `0.000M`.

### Terminal display

Daily and monthly dates use the compact `Mon DD` format. Multiple model names are rendered on separate lines inside the `Models` column, allowing the table to grow vertically without unnecessarily widening the terminal output. Cell padding and common column caps are reduced for narrow panes. JSON output and accounting behavior are unchanged.

