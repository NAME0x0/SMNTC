#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const args = process.argv.slice(2);
const inputPath = getOptionValue(args, '--from') ?? 'artifacts/perf/benchmark-results.json';
const outputPath = getOptionValue(args, '--out') ?? null;

const inputAbs = resolve(rootDir, inputPath);
if (!existsSync(inputAbs)) {
  console.error(`Missing perf report JSON: ${inputPath}`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(inputAbs, 'utf8'));
if (!Array.isArray(report.benchmarks)) {
  console.error('Invalid perf report JSON: missing "benchmarks" array.');
  process.exit(1);
}

const lines = [];
lines.push('## Performance Summary');
lines.push('');
lines.push(`- Generated: ${report.generatedAt ?? 'unknown'}`);
lines.push(`- Runtime: ${report.node ?? 'unknown'} on ${report.platform ?? 'unknown'} (${report.arch ?? 'unknown'})`);

const baselineInfo = report.baseline;
if (baselineInfo?.enabled) {
  lines.push(`- Baseline: ${baselineInfo.locked ? 'locked' : 'unlocked'}`);
} else {
  lines.push('- Baseline: disabled');
}
lines.push('');
lines.push('| Benchmark | Median ns/op | Budget Allowed ns/op | Baseline Delta | Baseline Limit | Status |');
lines.push('|---|---:|---:|---:|---:|---|');

for (const bench of report.benchmarks) {
  const median = fmt(bench.medianNsPerOp);
  const allowed = fmt(bench.allowedNsPerOp);
  const baselineDelta = bench.baselineRegressionPct == null
    ? 'n/a'
    : `${bench.baselineRegressionPct >= 0 ? '+' : ''}${bench.baselineRegressionPct.toFixed(2)}%`;
  const baselineLimit = bench.baselineMaxRegressionPct == null
    ? 'n/a'
    : `+${Number(bench.baselineMaxRegressionPct).toFixed(2)}%`;

  const status = bench.pass === true && (bench.baselinePass == null || bench.baselinePass === true)
    ? 'pass'
    : 'fail';

  lines.push(`| ${bench.name} | ${median} | ${allowed} | ${baselineDelta} | ${baselineLimit} | ${status} |`);
}

const markdown = `${lines.join('\n')}\n`;

if (outputPath) {
  const outputAbs = resolve(rootDir, outputPath);
  mkdirSync(dirname(outputAbs), { recursive: true });
  writeFileSync(outputAbs, markdown, 'utf8');
  console.log(`Wrote performance summary: ${outputPath}`);
} else {
  process.stdout.write(markdown);
}

function fmt(value) {
  if (!Number.isFinite(value)) return 'n/a';
  return Number(value).toFixed(2);
}

/**
 * @param {string[]} cliArgs
 * @param {string} flag
 * @returns {string | null}
 */
function getOptionValue(cliArgs, flag) {
  const flagWithEquals = `${flag}=`;
  for (const arg of cliArgs) {
    if (arg.startsWith(flagWithEquals)) {
      return arg.slice(flagWithEquals.length);
    }
  }

  const idx = cliArgs.indexOf(flag);
  if (idx === -1) return null;
  if (idx + 1 >= cliArgs.length || cliArgs[idx + 1].startsWith('--')) {
    throw new Error(`Expected a value after ${flag}`);
  }
  return cliArgs[idx + 1];
}
