# ccusage-codex-m

一个用于统计 Codex 本地会话用量与费用的脚本与命令集合。  
A local script + shell command snippets for tracking Codex token usage and estimated cost.

## 中文说明

### 这是什么

本仓库提供一个本地脚本 `ccusage_m_view.js`，用于从你的 Codex 数据目录（默认 `~/.codex`）读取 session 事件（JSONL），重建每日、每月、以及“未归档 session”的用量与计费统计。

它的目标是：
- 输出更易读的表格（包含模型名换行展示、token 以 `M` 单位显示等）
- 统一口径（daily / monthly / sessions 三种统计都走同一套重建与计费逻辑）

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
- 日/月：`Data | Models | Input | Cache | Output | Reason | Total | Cost`
- session：`Started | Session | Models | Input | Cache | Output | Reason | Total | Cost`

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
注意：价格表可能会随时间变化，建议你定期更新价格数据或在脚本里维护你自己的价格表。

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

### Pricing note

Cost is computed using an internal price table. Prices can change; keep your table updated if you rely on cost accuracy.

