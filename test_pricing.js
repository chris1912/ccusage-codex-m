const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccusage-pricing-'));
const sessionDir = path.join(tempHome, 'sessions');
const sessionFile = path.join(sessionDir, 'pricing.jsonl');

try {
  fs.mkdirSync(sessionDir, { recursive: true });
  const records = [
    // Codex 2026-07-16：订阅用户估算中，GPT-5.6 超过 272K 仍使用统一价格。
    { type: 'turn_context', timestamp: '2026-07-12T00:00:00Z', payload: { model: 'gpt-5.6-sol' } },
    {
      type: 'event_msg',
      timestamp: '2026-07-12T00:00:01Z',
      payload: {
        type: 'token_count',
        info: { last_token_usage: { input_tokens: 300000, output_tokens: 10000, total_tokens: 310000 } },
      },
    },
    { type: 'turn_context', timestamp: '2026-07-13T00:00:00Z', payload: { model: 'gpt-5.5' } },
    {
      type: 'event_msg',
      timestamp: '2026-07-13T00:00:01Z',
      payload: {
        type: 'token_count',
        info: { last_token_usage: { input_tokens: 300000, output_tokens: 10000, total_tokens: 310000 } },
      },
    },
  ];
  fs.writeFileSync(sessionFile, `${records.map(JSON.stringify).join('\n')}\n`, 'utf8');

  const output = execFileSync(process.execPath, [
    path.join(__dirname, 'ccusage_m_view.js'),
    'daily',
    '--json',
    '--since',
    '2026-07-12',
    '--until',
    '2026-07-13',
  ], {
    env: { ...process.env, CODEX_HOME: tempHome },
    encoding: 'utf8',
  });
  const report = JSON.parse(output);
  assert.strictEqual(report.daily[0].costUSD, 1.8, 'GPT-5.6 超过 272K 时不应切换长上下文价格');
  assert.strictEqual(report.daily[1].costUSD, 3.45, 'GPT-5.5 超过 272K 时仍应切换长上下文价格');

  const compactOutput = execFileSync(process.execPath, [
    path.join(__dirname, 'ccusage_m_view.js'),
    'daily',
    '--since',
    '2026-07-12',
    '--until',
    '2026-07-13',
  ], {
    env: { ...process.env, CODEX_HOME: tempHome },
    encoding: 'utf8',
  });
  assert.ok(compactOutput.includes('|Jul 12|gpt-5.6-sol'), '表格应使用紧凑日期');
  assert.ok(compactOutput.includes('|Jul 13|gpt-5.5'), '表格应使用紧凑日期');
  assert.ok(!compactOutput.includes('| Jul 12, 2026 |'), '表格不应保留旧的日期格式和左右空格');

  const currentPricingFile = path.join(sessionDir, 'current-pricing.jsonl');
  const currentPricingRecords = [
    // Codex 2026-07-31：验证价格变更日前后按 token_count 时间分别计费。
    { type: 'turn_context', timestamp: '2026-07-30T00:00:00Z', payload: { model: 'gpt-5.6-terra' } },
    {
      type: 'event_msg',
      timestamp: '2026-07-30T00:00:01Z',
      payload: {
        type: 'token_count',
        info: {
          last_token_usage: {
            input_tokens: 1000000,
            cached_input_tokens: 200000,
            cache_write_input_tokens: 100000,
            output_tokens: 100000,
            total_tokens: 1100000,
          },
        },
      },
    },
    { type: 'turn_context', timestamp: '2026-07-31T00:00:00Z', payload: { model: 'gpt-5.6-luna' } },
    {
      type: 'event_msg',
      timestamp: '2026-07-31T00:00:01Z',
      payload: {
        type: 'token_count',
        info: {
          last_token_usage: {
            input_tokens: 1000000,
            cached_input_tokens: 200000,
            cache_write_input_tokens: 100000,
            output_tokens: 100000,
            total_tokens: 1100000,
          },
        },
      },
    },
    { type: 'turn_context', timestamp: '2026-08-01T00:00:00Z', payload: { model: 'gpt-5.6-terra' } },
    {
      type: 'event_msg',
      timestamp: '2026-08-01T00:00:01Z',
      payload: {
        type: 'token_count',
        info: {
          last_token_usage: {
            input_tokens: 1000000,
            cached_input_tokens: 200000,
            cache_write_input_tokens: 100000,
            output_tokens: 100000,
            total_tokens: 1100000,
          },
        },
      },
    },
  ];
  fs.writeFileSync(currentPricingFile, `${currentPricingRecords.map(JSON.stringify).join('\n')}\n`, 'utf8');

  const currentPricingOutput = execFileSync(process.execPath, [
    path.join(__dirname, 'ccusage_m_view.js'),
    'daily',
    '--json',
    '--since',
    '2026-07-30',
    '--until',
    '2026-08-01',
    '--timezone',
    'UTC',
  ], {
    env: { ...process.env, CODEX_HOME: tempHome },
    encoding: 'utf8',
  });
  const currentPricingReport = JSON.parse(currentPricingOutput);
  assert.strictEqual(currentPricingReport.daily[0].costUSD, 3.6125, '价格变更前的 GPT-5.6 Terra 应使用历史价格');
  assert.strictEqual(currentPricingReport.daily[1].costUSD, 0.289, '价格变更后的 GPT-5.6 Luna 应使用当前价格');
  assert.strictEqual(currentPricingReport.daily[2].costUSD, 2.89, '价格变更后的 GPT-5.6 Terra 应使用当前价格');

  const noteOutput = execFileSync(process.execPath, [
    path.join(__dirname, 'ccusage_m_view.js'),
    'daily',
    '--since',
    '2026-07-30',
    '--until',
    '2026-08-01',
    '--timezone',
    'UTC',
  ], {
    env: { ...process.env, CODEX_HOME: tempHome },
    encoding: 'utf8',
  });
  const noteLines = noteOutput.split(/\r?\n/);
  const preChangeLine = noteLines.find((line) => line.includes('|Jul 30|'));
  const changeLine = noteLines.find((line) => line.includes('|Jul 31|'));
  const headerLine = noteLines.find((line) => line.includes('Data') && line.includes('Notes'));
  assert.ok(headerLine && headerLine.endsWith('|'), '终端表格最右侧应包含 Notes 列');
  assert.ok(preChangeLine && !preChangeLine.includes('官方价格变更'), '价格变更前日期不应显示价格变更备注');
  assert.ok(changeLine && changeLine.includes('官方价格变更'), '价格变更生效日期应显示价格变更备注');

  const forkParentFile = path.join(sessionDir, 'fork-parent.jsonl');
  const forkChildFile = path.join(sessionDir, 'fork-child.jsonl');
  const forkParentRecords = [
    { type: 'session_meta', timestamp: '2026-07-14T00:00:00.000Z', payload: { id: 'fork-parent' } },
    { type: 'turn_context', timestamp: '2026-07-14T00:00:00.000Z', payload: { model: 'gpt-5.6-sol' } },
    {
      type: 'event_msg',
      timestamp: '2026-07-14T00:00:01.000Z',
      payload: {
        type: 'token_count',
        info: {
          last_token_usage: { input_tokens: 1000, output_tokens: 100, total_tokens: 1100 },
          total_token_usage: { input_tokens: 1000, output_tokens: 100, total_tokens: 1100 },
        },
      },
    },
    {
      type: 'event_msg',
      timestamp: '2026-07-14T00:00:02.000Z',
      payload: {
        type: 'token_count',
        info: {
          last_token_usage: { input_tokens: 2000, cached_input_tokens: 1000, output_tokens: 100, total_tokens: 2100 },
          total_token_usage: { input_tokens: 3000, cached_input_tokens: 1000, output_tokens: 200, total_tokens: 3200 },
        },
      },
    },
  ];
  const forkChildRecords = [
    {
      type: 'session_meta',
      timestamp: '2026-07-15T00:00:00.000Z',
      payload: { id: 'fork-child', forked_from_id: 'fork-parent', timestamp: '2026-07-15T00:00:00.000Z' },
    },
    { type: 'turn_context', timestamp: '2026-07-15T00:00:00.000Z', payload: { model: 'gpt-5.6-sol' } },
    ...forkParentRecords.slice(2).map((record) => ({ ...record, timestamp: record.timestamp.replace('2026-07-14', '2026-07-15') })),
    {
      type: 'event_msg',
      timestamp: '2026-07-15T00:00:03.000Z',
      payload: {
        type: 'token_count',
        info: {
          last_token_usage: { input_tokens: 1500, cached_input_tokens: 500, output_tokens: 100, total_tokens: 1600 },
          total_token_usage: { input_tokens: 4500, cached_input_tokens: 1500, output_tokens: 300, total_tokens: 4800 },
        },
      },
    },
  ];
  fs.writeFileSync(forkParentFile, `${forkParentRecords.map(JSON.stringify).join('\n')}\n`, 'utf8');
  fs.writeFileSync(forkChildFile, `${forkChildRecords.map(JSON.stringify).join('\n')}\n`, 'utf8');

  const forkOutput = execFileSync(process.execPath, [
    path.join(__dirname, 'ccusage_m_view.js'),
    'daily',
    '--json',
    '--since',
    '2026-07-14',
    '--until',
    '2026-07-15',
  ], {
    env: { ...process.env, CODEX_HOME: tempHome },
    encoding: 'utf8',
  });
  const forkReport = JSON.parse(forkOutput);
  assert.strictEqual(forkReport.totals.inputTokens, 4500, 'fork 复制的父历史不应再次计入');
  assert.strictEqual(forkReport.totals.cachedInputTokens, 1500, 'fork 缓存输入不应重复计入');
  assert.strictEqual(forkReport.totals.outputTokens, 300, 'fork 输出应只计入真实新增部分');
  assert.strictEqual(forkReport.stats.forkReplaySuppressed, 2, '应标记跳过的 fork 历史事件');
  assert.ok(Math.abs(forkReport.totals.costUSD - 0.02475) < 1e-12, 'fork 费用应只包含父历史一次和分支新增量');
  console.log('GPT-5.6 订阅用户统一价格与 fork 复制历史去重检查通过');
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true });
}
