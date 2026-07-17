const fs = require('fs');
const path = require('path');
const os = require('os');

const MILLION = 1_000_000;
const LONG_CONTEXT_THRESHOLD = 272_000;
const DEFAULT_CODEX_HOME = process.env.CODEX_HOME && process.env.CODEX_HOME.trim()
  ? path.resolve(process.env.CODEX_HOME.trim())
  : path.join(os.homedir(), '.codex');
const DEFAULT_SESSION_DIR = path.join(DEFAULT_CODEX_HOME, 'sessions');
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const LEGACY_FALLBACK_MODEL = 'gpt-5';
const MODES = new Set(['daily', 'monthly', 'sessions']);

// Codex 2026-07-18: keep terminal tables compact so narrow panes remain readable.
const TABLE_CELL_PADDING = 0;
const USAGE_TABLE_CAPS = {
  Data: 7,
  Models: 16,
  Input: 9,
  Cache: 9,
  Write: 9,
  Output: 9,
  Reason: 9,
  Total: 9,
  Cost: 9,
};
const SESSION_TABLE_CAPS = {
  Started: 18,
  Session: 40,
  Models: 28,
  Input: 9,
  Cache: 9,
  Write: 9,
  Output: 9,
  Reason: 9,
  Total: 9,
  Cost: 9,
};

// 每 100 万 token 的美元价格。
// Codex 2026-07-16：GPT-5.6 面向订阅用户按统一价格估算；其他含 Above 字段的模型维持既有规则。
// reasoningOutputTokens 仅展示，不单独计费，因为价格口径为输入、缓存和输出。
const PRICING_PER_M = {
  // Codex 2026-07-16：订阅用户估算不应用 GPT-5.6 的 API 长上下文加价。
  'gpt-5.6-sol': { input: 5.0, cache: 0.5, cacheWrite: 6.25, output: 30.0 },
  'gpt-5.6-terra': { input: 2.5, cache: 0.25, cacheWrite: 3.125, output: 15.0 },
  'gpt-5.6-luna': { input: 1.0, cache: 0.1, cacheWrite: 1.25, output: 6.0 },
  'gpt-5.5': { input: 5.0, cache: 0.5, output: 30.0, inputAbove: 10.0, cacheAbove: 1.0, outputAbove: 45.0 },
  // Pro models do not advertise a cached-input discount; bill cached input at the standard input rate.
  'gpt-5.5-pro': { input: 30.0, cache: 30.0, output: 180.0, inputAbove: 60.0, cacheAbove: 60.0, outputAbove: 270.0 },
  'gpt-5.4': { input: 2.5, cache: 0.25, output: 15.0, inputAbove: 5.0, cacheAbove: 0.5, outputAbove: 22.5 },
  'gpt-5.4-pro': { input: 30.0, cache: 30.0, output: 180.0, inputAbove: 60.0, cacheAbove: 60.0, outputAbove: 270.0 },
  'gpt-5.4-mini': { input: 0.75, cache: 0.075, output: 4.5 },
  'gpt-5.4-nano': { input: 0.2, cache: 0.02, output: 1.25 },
  'gpt-5.3-codex': { input: 1.75, cache: 0.175, output: 14.0 },
  'gpt-5.2': { input: 1.75, cache: 0.175, output: 14.0 },
  'gpt-5.2-codex': { input: 1.75, cache: 0.175, output: 14.0 },
  'gpt-5.2-pro': { input: 21.0, cache: 21.0, output: 168.0 },
  'gpt-5.1': { input: 1.25, cache: 0.125, output: 10.0 },
  'gpt-5.1-codex': { input: 1.25, cache: 0.125, output: 10.0 },
  'gpt-5.1-codex-max': { input: 1.25, cache: 0.125, output: 10.0 },
  'gpt-5.1-codex-mini': { input: 0.25, cache: 0.025, output: 2.0 },
  'gpt-5': { input: 1.25, cache: 0.125, output: 10.0 },
  'gpt-5-pro': { input: 15.0, cache: 15.0, output: 120.0 },
  'gpt-5-mini': { input: 0.25, cache: 0.025, output: 2.0 },
  'gpt-5-nano': { input: 0.05, cache: 0.005, output: 0.4 },
  'gpt-5-chat': { input: 1.25, cache: 0.125, output: 10.0 },
  'gpt-5-codex': { input: 1.25, cache: 0.125, output: 10.0 },
  'gpt-5-search-api': { input: 1.25, cache: 0.125, output: 10.0 },
  'codex-mini-latest': { input: 1.5, cache: 0.375, output: 6.0 },
  'openrouter/free': { input: 0.0, cache: 0.0, output: 0.0 },
};

const MODEL_ALIASES = {
  'gpt-5.2-codex-latest': 'gpt-5.2-codex',
  'gpt-5.3-chat': 'gpt-5.2',
  'gpt-5.3-codex-latest': 'gpt-5.3-codex',
};

function normalizeModelName(name) {
  if (!name) return '';
  const value = String(name).trim();
  if (!value) return '';
  const parts = value.split('/');
  return parts[parts.length - 1];
}

function isFreeModel(modelName) {
  const normalized = String(modelName || '').trim().toLowerCase();
  return normalized === 'openrouter/free' || (normalized.startsWith('openrouter/') && normalized.endsWith(':free'));
}

function getPricing(modelName) {
  if (!modelName) return null;
  if (isFreeModel(modelName)) return PRICING_PER_M['openrouter/free'];
  const normalized = normalizeModelName(modelName);
  return PRICING_PER_M[normalized] || PRICING_PER_M[MODEL_ALIASES[normalized]] || null;
}

function ensureNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asNonEmptyString(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function normalizeRawUsage(value) {
  if (value == null || typeof value !== 'object') return null;
  const input = ensureNumber(value.input_tokens);
  const cached = ensureNumber(value.cached_input_tokens ?? value.cache_read_input_tokens);
  const cacheWrite = ensureNumber(value.cache_write_input_tokens ?? value.cache_creation_input_tokens ?? value.cache_write_tokens);
  const output = ensureNumber(value.output_tokens);
  const reasoning = ensureNumber(value.reasoning_output_tokens);
  const total = ensureNumber(value.total_tokens);
  return {
    input_tokens: input,
    cached_input_tokens: cached,
    cache_write_input_tokens: cacheWrite,
    output_tokens: output,
    reasoning_output_tokens: reasoning,
    total_tokens: total > 0 ? total : input + output,
  };
}

function subtractRawUsage(current, previous) {
  return {
    input_tokens: Math.max(current.input_tokens - (previous?.input_tokens ?? 0), 0),
    cached_input_tokens: Math.max(current.cached_input_tokens - (previous?.cached_input_tokens ?? 0), 0),
    cache_write_input_tokens: Math.max(current.cache_write_input_tokens - (previous?.cache_write_input_tokens ?? 0), 0),
    output_tokens: Math.max(current.output_tokens - (previous?.output_tokens ?? 0), 0),
    reasoning_output_tokens: Math.max(current.reasoning_output_tokens - (previous?.reasoning_output_tokens ?? 0), 0),
    total_tokens: Math.max(current.total_tokens - (previous?.total_tokens ?? 0), 0),
  };
}

function convertToDelta(raw) {
  const total = raw.total_tokens > 0 ? raw.total_tokens : raw.input_tokens + raw.output_tokens;
  const cached = Math.min(raw.cached_input_tokens, raw.input_tokens);
  const cacheWrite = Math.min(raw.cache_write_input_tokens, Math.max(raw.input_tokens - cached, 0));
  return {
    inputTokens: raw.input_tokens,
    cachedInputTokens: cached,
    cacheWriteInputTokens: cacheWrite,
    outputTokens: raw.output_tokens,
    reasoningOutputTokens: raw.reasoning_output_tokens,
    totalTokens: total,
  };
}

function extractModel(payload) {
  if (payload == null || typeof payload !== 'object') return undefined;
  const info = payload.info;
  if (info != null && typeof info === 'object') {
    for (const candidate of [info.model, info.model_name]) {
      const model = asNonEmptyString(candidate);
      if (model != null) return model;
    }
    if (info.metadata != null && typeof info.metadata === 'object') {
      const model = asNonEmptyString(info.metadata.model);
      if (model != null) return model;
    }
  }
  const fallbackModel = asNonEmptyString(payload.model);
  if (fallbackModel != null) return fallbackModel;
  if (payload.metadata != null && typeof payload.metadata === 'object') {
    const model = asNonEmptyString(payload.metadata.model);
    if (model != null) return model;
  }
  return undefined;
}

function parseArgs(argv) {
  const options = {
    mode: 'daily',
    sessionDirs: [DEFAULT_SESSION_DIR],
    timezone: DEFAULT_TIMEZONE,
    locale: 'en-US',
    json: false,
    help: false,
    legacyInputPath: null,
  };

  let modeExplicitlySet = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (MODES.has(arg) && !modeExplicitlySet) {
      options.mode = arg;
      modeExplicitlySet = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--since') {
      options.since = normalizeFilterDate(argv[++i]);
    } else if (arg === '--until') {
      options.until = normalizeFilterDate(argv[++i]);
    } else if (arg === '--timezone') {
      options.timezone = argv[++i] || DEFAULT_TIMEZONE;
    } else if (arg === '--locale') {
      options.locale = argv[++i] || 'en-US';
    } else if (arg === '--session-dir') {
      const dir = argv[++i];
      if (dir) options.sessionDirs.push(path.resolve(dir));
    } else if (!arg.startsWith('-') && options.legacyInputPath == null) {
      options.legacyInputPath = path.resolve(arg);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.sessionDirs.length > 1) {
    options.sessionDirs = options.sessionDirs.filter((value, index, array) => array.indexOf(value) === index);
  }
  return options;
}

function normalizeFilterDate(value) {
  if (value == null) return undefined;
  const compact = String(value).replaceAll('-', '').trim();
  if (!/^\d{8}$/.test(compact)) {
    throw new Error(`Invalid date format: ${value}. Expected YYYYMMDD or YYYY-MM-DD.`);
  }
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

function formatDateKeyUTC(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDateKey(dateKey, deltaDays) {
  const [yearStr = '0', monthStr = '1', dayStr = '1'] = String(dateKey).split('-');
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return formatDateKeyUTC(date);
}

function applyDefaultDailyWindow(options) {
  if (options.mode !== 'daily') return;
  if (options.since != null || options.until != null) return;
  const todayKey = toDateKey(new Date().toISOString(), options.timezone);
  options.until = todayKey;
  options.since = shiftDateKey(todayKey, -19);
}

function safeTimeZone(timezone) {
  if (timezone == null || String(timezone).trim() === '') return DEFAULT_TIMEZONE;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return timezone;
  } catch {
    return 'UTC';
  }
}

function toDateKey(timestamp, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: safeTimeZone(timezone),
  });
  return formatter.format(new Date(timestamp));
}

function toMonthKey(timestamp, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: safeTimeZone(timezone),
  });
  const [year, month] = formatter.format(new Date(timestamp)).split('-');
  return `${year}-${month}`;
}

function formatDisplayDate(dateKey, locale) {
  const [yearStr = '0', monthStr = '1', dayStr = '1'] = dateKey.split('-');
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(locale ?? 'en-US', {
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

function formatDisplayMonth(monthKey, locale) {
  const [yearStr = '0', monthStr = '1'] = monthKey.split('-');
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat(locale ?? 'en-US', {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

function formatDisplayDateTime(timestamp, locale, timezone) {
  return new Intl.DateTimeFormat(locale ?? 'en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: safeTimeZone(timezone),
  }).format(new Date(timestamp));
}

function isWithinRange(dateKey, since, until) {
  const value = dateKey.replaceAll('-', '');
  const sinceValue = since?.replaceAll('-', '');
  const untilValue = until?.replaceAll('-', '');
  if (sinceValue != null && value < sinceValue) return false;
  if (untilValue != null && value > untilValue) return false;
  return true;
}

function createEmptyUsage() {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  };
}

function addUsage(target, delta) {
  target.inputTokens += delta.inputTokens;
  target.cachedInputTokens += delta.cachedInputTokens;
  target.cacheWriteInputTokens += delta.cacheWriteInputTokens;
  target.outputTokens += delta.outputTokens;
  target.reasoningOutputTokens += delta.reasoningOutputTokens;
  target.totalTokens += delta.totalTokens;
}

function createEventCost(usage, pricing) {
  if (pricing == null) return 0;
  const inputTokens = Number(usage.inputTokens || 0);
  const cachedInputTokens = Math.min(Number(usage.cachedInputTokens || 0), inputTokens);
  const cacheWriteInputTokens = Math.min(Number(usage.cacheWriteInputTokens || 0), Math.max(inputTokens - cachedInputTokens, 0));
  const nonCachedInputTokens = Math.max(0, inputTokens - cachedInputTokens - cacheWriteInputTokens);
  const outputTokens = Number(usage.outputTokens || 0);
  const useLongContextRates = inputTokens > LONG_CONTEXT_THRESHOLD;
  const inputRate = useLongContextRates ? (pricing.inputAbove ?? pricing.input ?? 0) : (pricing.input ?? 0);
  const cacheRate = useLongContextRates ? (pricing.cacheAbove ?? pricing.cache ?? 0) : (pricing.cache ?? 0);
  const cacheWriteRate = useLongContextRates ? (pricing.cacheWriteAbove ?? pricing.cacheWrite ?? 0) : (pricing.cacheWrite ?? 0);
  const outputRate = useLongContextRates ? (pricing.outputAbove ?? pricing.output ?? 0) : (pricing.output ?? 0);
  return nonCachedInputTokens / MILLION * inputRate
    + cachedInputTokens / MILLION * cacheRate
    + cacheWriteInputTokens / MILLION * cacheWriteRate
    + outputTokens / MILLION * outputRate;
}

function* walkJsonlFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && fullPath.toLowerCase().endsWith('.jsonl')) {
        yield fullPath;
      }
    }
  }
}

/**
 * 读取并解析一个 JSONL 会话文件；坏行直接忽略，保持原统计逻辑的容错行为。
 * Codex 2026-07-17：先缓存解析结果，供 fork 父子序列核对和正式计费共用。
 */
function readJsonlRecords(file) {
  const records = [];
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const record = JSON.parse(trimmed);
      records.push(record);
    } catch {
      continue;
    }
  }
  return records;
}

function getSessionMeta(records) {
  return records.find((record) => {
    return record?.type === 'session_meta' && record.payload?.id != null;
  });
}

function getTokenCountRecords(records) {
  return records.filter((record) => {
    return record?.type === 'event_msg' && record.payload?.type === 'token_count';
  });
}

function getRawUsageFingerprint(record) {
  const info = record?.payload?.info;
  const lastUsage = normalizeRawUsage(info?.last_token_usage);
  const totalUsage = normalizeRawUsage(info?.total_token_usage);
  if (totalUsage != null) return JSON.stringify({ totalUsage });
  if (lastUsage != null) return JSON.stringify({ lastUsage });
  return null;
}

/**
 * 查找 fork 子文件开头复制的父 token 序列。
 * fork 会重写复制记录的时间戳，因此必须按累计用量序列比对，不能按时间戳去重。
 */
function findForkReplayCount(childRecords, parentRecords, forkTimestamp) {
  const childTokens = getTokenCountRecords(childRecords);
  const forkTime = Date.parse(forkTimestamp || '');
  const parentTokens = getTokenCountRecords(parentRecords).filter((record) => {
    const timestamp = Date.parse(record.timestamp || '');
    return !Number.isFinite(forkTime) || !Number.isFinite(timestamp) || timestamp <= forkTime;
  });
  if (childTokens.length === 0 || parentTokens.length === 0) return 0;

  const childFingerprints = childTokens.map(getRawUsageFingerprint);
  const parentFingerprints = parentTokens.map(getRawUsageFingerprint);
  let bestMatch = 0;
  for (let start = 0; start < parentFingerprints.length; start += 1) {
    if (childFingerprints[0] !== parentFingerprints[start]) continue;
    let matchLength = 0;
    while (
      start + matchLength < parentFingerprints.length &&
      matchLength < childFingerprints.length &&
      childFingerprints[matchLength] === parentFingerprints[start + matchLength]
    ) {
      matchLength += 1;
    }
    bestMatch = Math.max(bestMatch, matchLength);
  }
  return bestMatch;
}

/**
 * 从原始会话事件重建增量用量；fork 复制前缀只更新累计基线，不生成费用事件。
 */
function loadTokenUsageEvents(sessionDirs) {
  const events = [];
  const missingDirectories = [];
  const stats = {
    files: 0,
    tokenCountEvents: 0,
    duplicateSuppressed: 0,
    forkReplaySuppressed: 0,
  };
  const sessionFiles = [];

  for (const dir of sessionDirs) {
    const directoryPath = path.resolve(dir);
    if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
      missingDirectories.push(directoryPath);
      continue;
    }

    for (const file of walkJsonlFiles(directoryPath)) {
      stats.files += 1;
      const sessionId = path.relative(directoryPath, file).split(path.sep).join('/').replace(/\.jsonl$/i, '');
      sessionFiles.push({ file, sessionId, records: readJsonlRecords(file) });
    }
  }

  const filesByCodexId = new Map();
  for (const sessionFile of sessionFiles) {
    const meta = getSessionMeta(sessionFile.records);
    const codexId = asNonEmptyString(meta?.payload?.id);
    if (codexId != null) filesByCodexId.set(codexId, sessionFile);
  }

  const forkReplayCounts = new Map();
  for (const sessionFile of sessionFiles) {
    const meta = getSessionMeta(sessionFile.records);
    const parentId = asNonEmptyString(meta?.payload?.forked_from_id);
    if (parentId == null) continue;
    const parentFile = filesByCodexId.get(parentId);
    if (parentFile == null) continue;
    const forkTime = meta.payload?.timestamp || meta.timestamp;
    const replayCount = findForkReplayCount(sessionFile.records, parentFile.records, forkTime);
    if (replayCount > 0) forkReplayCounts.set(sessionFile.sessionId, replayCount);
  }

  for (const sessionFile of sessionFiles) {
    const { sessionId, records } = sessionFile;
    let previousTotals = null;
    let currentModel;
    let currentModelIsFallback = false;
    let forkReplayRemaining = forkReplayCounts.get(sessionId) || 0;

    for (const record of records) {
      if (record?.type === 'turn_context') {
        const contextModel = extractModel(record.payload);
        if (contextModel != null) {
          currentModel = contextModel;
          currentModelIsFallback = false;
        }
        continue;
      }

      if (record?.type !== 'event_msg' || record?.payload?.type !== 'token_count') continue;
      stats.tokenCountEvents += 1;

      const timestamp = record.timestamp;
      if (timestamp == null) continue;
      const info = record.payload.info;
      const lastUsage = normalizeRawUsage(info?.last_token_usage);
      const totalUsage = normalizeRawUsage(info?.total_token_usage);

      let raw = null;
      if (totalUsage != null) {
        if (previousTotals != null &&
          totalUsage.input_tokens === previousTotals.input_tokens &&
          totalUsage.cached_input_tokens === previousTotals.cached_input_tokens &&
          totalUsage.cache_write_input_tokens === previousTotals.cache_write_input_tokens &&
          totalUsage.output_tokens === previousTotals.output_tokens &&
          totalUsage.reasoning_output_tokens === previousTotals.reasoning_output_tokens &&
          totalUsage.total_tokens === previousTotals.total_tokens &&
          lastUsage != null &&
          (lastUsage.input_tokens > 0 || lastUsage.cached_input_tokens > 0 || lastUsage.cache_write_input_tokens > 0 || lastUsage.output_tokens > 0 || lastUsage.reasoning_output_tokens > 0 || lastUsage.total_tokens > 0)) {
          stats.duplicateSuppressed += 1;
        }
        raw = subtractRawUsage(totalUsage, previousTotals);
        previousTotals = totalUsage;
      } else {
        raw = lastUsage;
      }

      if (forkReplayRemaining > 0) {
        const replayModel = extractModel({ ...(record.payload || {}), info });
        if (replayModel != null) {
          currentModel = replayModel;
          currentModelIsFallback = false;
        }
        forkReplayRemaining -= 1;
        stats.forkReplaySuppressed += 1;
        continue;
      }

      if (raw == null) continue;
      const delta = convertToDelta(raw);
      if (delta.inputTokens === 0 && delta.cachedInputTokens === 0 && delta.cacheWriteInputTokens === 0 && delta.outputTokens === 0 && delta.reasoningOutputTokens === 0) continue;

      const extractedModel = extractModel({ ...(record.payload || {}), info });
      let isFallbackModel = false;
      if (extractedModel != null) {
        currentModel = extractedModel;
        currentModelIsFallback = false;
      }

      let model = extractedModel ?? currentModel;
      if (model == null) {
        model = LEGACY_FALLBACK_MODEL;
        isFallbackModel = true;
        currentModel = model;
        currentModelIsFallback = true;
      } else if (extractedModel == null && currentModelIsFallback) {
        isFallbackModel = true;
      }

      const event = {
        sessionId,
        timestamp,
        model,
        inputTokens: delta.inputTokens,
        cachedInputTokens: delta.cachedInputTokens,
        cacheWriteInputTokens: delta.cacheWriteInputTokens,
        outputTokens: delta.outputTokens,
        reasoningOutputTokens: delta.reasoningOutputTokens,
        totalTokens: delta.totalTokens,
      };
      if (isFallbackModel) event.isFallbackModel = true;
      events.push(event);
    }
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return { events, missingDirectories, stats };
}

function createSummaryForMode(key, event) {
  return {
    key,
    firstTimestamp: event.timestamp,
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
    costUSD: 0,
    models: new Map(),
    sessionId: event.sessionId,
  };
}

function groupKeyForMode(event, mode, timezone) {
  if (mode === 'monthly') return toMonthKey(event.timestamp, timezone);
  if (mode === 'sessions') return event.sessionId;
  return toDateKey(event.timestamp, timezone);
}

function buildGroupedReport(events, options) {
  const summaries = new Map();
  const unknownModels = new Set();
  const mode = options.mode;

  for (const event of events) {
    const modelName = event.model?.trim();
    if (!modelName) continue;
    const dateKey = toDateKey(event.timestamp, options.timezone);
    if (!isWithinRange(dateKey, options.since, options.until)) continue;

    const key = groupKeyForMode(event, mode, options.timezone);
    let summary = summaries.get(key);
    if (!summary) {
      summary = createSummaryForMode(key, event);
      summaries.set(key, summary);
    }

    addUsage(summary, event);
    if (new Date(event.timestamp).getTime() < new Date(summary.firstTimestamp).getTime()) {
      summary.firstTimestamp = event.timestamp;
    }

    let modelUsage = summary.models.get(modelName);
    if (!modelUsage) {
      modelUsage = { ...createEmptyUsage(), isFallback: false };
      summary.models.set(modelName, modelUsage);
    }
    addUsage(modelUsage, event);
    if (event.isFallbackModel === true) modelUsage.isFallback = true;

    const pricing = getPricing(modelName);
    if (pricing == null) {
      unknownModels.add(normalizeModelName(modelName) || modelName);
    } else {
      summary.costUSD += createEventCost(event, pricing);
    }
  }

  const rows = Array.from(summaries.values())
    .sort((a, b) => {
      if (mode === 'sessions') {
        const delta = new Date(a.firstTimestamp).getTime() - new Date(b.firstTimestamp).getTime();
        return delta !== 0 ? delta : a.key.localeCompare(b.key);
      }
      return a.key.localeCompare(b.key);
    })
    .map((summary) => {
      const rowModels = {};
      for (const [modelName, usage] of summary.models) rowModels[modelName] = { ...usage };

      if (mode === 'monthly') {
        return {
          monthKey: summary.key,
          month: formatDisplayMonth(summary.key, options.locale),
          inputTokens: summary.inputTokens,
          cachedInputTokens: summary.cachedInputTokens,
          cacheWriteInputTokens: summary.cacheWriteInputTokens,
          outputTokens: summary.outputTokens,
          reasoningOutputTokens: summary.reasoningOutputTokens,
          totalTokens: summary.totalTokens,
          costUSD: summary.costUSD,
          models: rowModels,
        };
      }

      if (mode === 'sessions') {
        const separatorIndex = summary.sessionId.lastIndexOf('/');
        const directory = separatorIndex >= 0 ? summary.sessionId.slice(0, separatorIndex) : '';
        const sessionFile = separatorIndex >= 0 ? summary.sessionId.slice(separatorIndex + 1) : summary.sessionId;
        return {
          sessionId: summary.sessionId,
          directory,
          sessionFile,
          startedAt: summary.firstTimestamp,
          started: formatDisplayDateTime(summary.firstTimestamp, options.locale, options.timezone),
          inputTokens: summary.inputTokens,
          cachedInputTokens: summary.cachedInputTokens,
          cacheWriteInputTokens: summary.cacheWriteInputTokens,
          outputTokens: summary.outputTokens,
          reasoningOutputTokens: summary.reasoningOutputTokens,
          totalTokens: summary.totalTokens,
          costUSD: summary.costUSD,
          models: rowModels,
        };
      }

      return {
        dateKey: summary.key,
        date: formatDisplayDate(summary.key, options.locale),
        inputTokens: summary.inputTokens,
        cachedInputTokens: summary.cachedInputTokens,
        cacheWriteInputTokens: summary.cacheWriteInputTokens,
        outputTokens: summary.outputTokens,
        reasoningOutputTokens: summary.reasoningOutputTokens,
        totalTokens: summary.totalTokens,
        costUSD: summary.costUSD,
        models: rowModels,
      };
    });

  const totals = rows.reduce((acc, row) => {
    acc.inputTokens += row.inputTokens;
    acc.cachedInputTokens += row.cachedInputTokens;
    acc.cacheWriteInputTokens += row.cacheWriteInputTokens;
    acc.outputTokens += row.outputTokens;
    acc.reasoningOutputTokens += row.reasoningOutputTokens;
    acc.totalTokens += row.totalTokens;
    acc.costUSD += row.costUSD;
    return acc;
  }, {
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
    costUSD: 0,
  });

  return { rows, totals, unknownModels: Array.from(unknownModels).sort() };
}

function usd(n) {
  return '$' + Number(n || 0).toFixed(2);
}

function m(n) {
  return (Number(n || 0) / MILLION).toFixed(3) + 'M';
}

function splitLines(value) {
  return String(value == null ? '' : value).split('\n');
}

function padRight(text, width) {
  const str = String(text);
  return str.length >= width ? str : str + ' '.repeat(width - str.length);
}

function renderTable(headers, rows, caps) {
  const widths = {};
  for (const header of headers) widths[header] = header.length;

  for (const row of rows) {
    for (const header of headers) {
      for (const line of splitLines(row[header])) {
        widths[header] = Math.max(widths[header], line.length);
      }
    }
  }

  for (const header of headers) widths[header] = Math.min(widths[header], caps[header] ?? widths[header]);

  const border = '+' + headers.map((header) => '-'.repeat(widths[header] + TABLE_CELL_PADDING * 2)).join('+') + '+';
  const formatCell = (value, width) => {
    const padding = ' '.repeat(TABLE_CELL_PADDING);
    return padding + padRight(value, width) + padding;
  };

  console.log(border);
  console.log('|' + headers.map((header) => formatCell(header, widths[header])).join('|') + '|');
  console.log(border);

  for (const row of rows) {
    const cellLines = {};
    let rowHeight = 1;
    for (const header of headers) {
      cellLines[header] = splitLines(row[header]);
      rowHeight = Math.max(rowHeight, cellLines[header].length);
    }

    for (let i = 0; i < rowHeight; i += 1) {
      const values = headers.map((header) => {
        const line = cellLines[header][i] || '';
        const clipped = line.length > widths[header] ? line.slice(0, Math.max(widths[header] - 1, 0)) + '…' : line;
        return formatCell(clipped, widths[header]);
      });
      console.log('|' + values.join('|') + '|');
    }
    console.log(border);
  }
}

function renderUsageTable(mode, rows, totals) {
  if (mode === 'sessions') {
    const headers = ['Started', 'Session', 'Models', 'Input', 'Cache', 'Write', 'Output', 'Reason', 'Total', 'Cost'];
    const printableRows = rows.map((row) => ({
      Started: row.started,
      Session: row.sessionId,
      Models: Object.keys(row.models || {}).map(normalizeModelName).sort().join('\n'),
      Input: m(row.inputTokens || 0),
      Cache: m(row.cachedInputTokens || 0),
      Write: m(row.cacheWriteInputTokens || 0),
      Output: m(row.outputTokens || 0),
      Reason: m(row.reasoningOutputTokens || 0),
      Total: m(row.totalTokens || 0),
      Cost: usd(row.costUSD || 0),
    }));
    renderTable(headers, printableRows, SESSION_TABLE_CAPS);
    console.log('Totals');
    renderTable(headers, [{
      Started: '-',
      Session: 'ALL',
      Models: '-',
      Input: m(totals.inputTokens || 0),
      Cache: m(totals.cachedInputTokens || 0),
      Write: m(totals.cacheWriteInputTokens || 0),
      Output: m(totals.outputTokens || 0),
      Reason: m(totals.reasoningOutputTokens || 0),
      Total: m(totals.totalTokens || 0),
      Cost: usd(totals.costUSD || 0),
    }], SESSION_TABLE_CAPS);
    return;
  }

  const headers = ['Data', 'Models', 'Input', 'Cache', 'Write', 'Output', 'Reason', 'Total', 'Cost'];
  const printableRows = rows.map((row) => ({
    Data: mode === 'monthly' ? String(row.month || '') : String(row.date || ''),
    Models: Object.keys(row.models || {}).map(normalizeModelName).sort().join('\n'),
    Input: m(row.inputTokens || 0),
    Cache: m(row.cachedInputTokens || 0),
    Write: m(row.cacheWriteInputTokens || 0),
    Output: m(row.outputTokens || 0),
    Reason: m(row.reasoningOutputTokens || 0),
    Total: m(row.totalTokens || 0),
    Cost: usd(row.costUSD || 0),
  }));

  renderTable(headers, printableRows, USAGE_TABLE_CAPS);
  console.log('Totals');
  renderTable(headers, [{
    Data: 'ALL',
    Models: '-',
    Input: m(totals.inputTokens || 0),
    Cache: m(totals.cachedInputTokens || 0),
    Write: m(totals.cacheWriteInputTokens || 0),
    Output: m(totals.outputTokens || 0),
    Reason: m(totals.reasoningOutputTokens || 0),
    Total: m(totals.totalTokens || 0),
    Cost: usd(totals.costUSD || 0),
  }], USAGE_TABLE_CAPS);
}

function printHelp() {
  console.log([
    'Usage: node ccusage_m_view.js [daily|monthly|sessions] [options]',
    '',
    'Options:',
    '  --since YYYY-MM-DD      Filter start date',
    '  --until YYYY-MM-DD      Filter end date',
    '  --timezone TZ           IANA timezone, default is local timezone',
    '  --locale LOCALE         Date locale, default en-US',
    '  --session-dir PATH      Additional session directory to scan',
    '  --json                  Output machine-readable JSON',
    '  --help                  Show help',
    '',
    'Notes:',
    '  * Default mode is daily, showing the last 20 days when no --since/--until is provided.',
    '  * Accounting is rebuilt from raw Codex session JSONL files.',
    '  * Repeated token_count snapshots are deduplicated via total_token_usage deltas.',
  ].join('\n'));
}

function buildJsonPayload(mode, rows, totals, stats, missingDirectories, unknownModels) {
  const payload = {
    totals,
    stats,
    missingDirectories,
    unknownModels,
  };
  if (mode === 'monthly') {
    payload.monthly = rows;
  } else if (mode === 'sessions') {
    payload.sessions = rows;
  } else {
    payload.daily = rows;
  }
  return payload;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  applyDefaultDailyWindow(options);
  if (options.help) {
    printHelp();
    return;
  }

  const { events, missingDirectories, stats } = loadTokenUsageEvents(options.sessionDirs);
  if (events.length === 0) {
    const payload = buildJsonPayload(options.mode, [], {
      inputTokens: 0,
      cachedInputTokens: 0,
      cacheWriteInputTokens: 0,
      outputTokens: 0,
      reasoningOutputTokens: 0,
      totalTokens: 0,
      costUSD: 0,
    }, stats, missingDirectories, []);
    if (options.json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log('No Codex usage data found.');
      if (missingDirectories.length > 0) {
        console.error(`Missing session directories: ${missingDirectories.join(', ')}`);
      }
    }
    return;
  }

  const report = buildGroupedReport(events, options);
  const payload = buildJsonPayload(options.mode, report.rows, report.totals, stats, missingDirectories, report.unknownModels);

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  renderUsageTable(options.mode, report.rows, report.totals);
  if (report.unknownModels.length > 0) {
    console.error(`Warning: pricing not configured for models: ${report.unknownModels.join(', ')}`);
  }
  if (missingDirectories.length > 0) {
    console.error(`Warning: missing session directories: ${missingDirectories.join(', ')}`);
  }
  if (stats.duplicateSuppressed > 0) {
    console.error(`Deduplicated repeated token_count entries: ${stats.duplicateSuppressed}`);
  }
  if (stats.forkReplaySuppressed > 0) {
    console.error(`已跳过 fork 复制的历史 token_count 记录: ${stats.forkReplaySuppressed}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
}
