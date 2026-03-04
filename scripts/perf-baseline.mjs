#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const args = process.argv.slice(2);
const reportPath = getOptionValue(args, '--from') ?? 'artifacts/perf/benchmark-results.json';
const outputPath = getOptionValue(args, '--out') ?? 'perf.baseline.json';
const lockBaseline = args.includes('--lock');
const unlockBaseline = args.includes('--unlock');
const allowNonCiLock = args.includes('--allow-non-ci-lock');

if (lockBaseline && unlockBaseline) {
  console.error('Cannot use --lock and --unlock together.');
  process.exit(1);
}

const reportAbs = resolve(rootDir, reportPath);
const outputAbs = resolve(rootDir, outputPath);

if (!existsSync(reportAbs)) {
  console.error(`Missing benchmark report: ${reportPath}`);
  process.exit(1);
}

const rawReport = readFileSync(reportAbs, 'utf8');
const report = JSON.parse(rawReport);
if (!Array.isArray(report.benchmarks)) {
  console.error('Invalid benchmark report: missing "benchmarks" array.');
  process.exit(1);
}

const existing = existsSync(outputAbs)
  ? JSON.parse(readFileSync(outputAbs, 'utf8'))
  : null;
const existingByName = new Map(
  Array.isArray(existing?.benchmarks)
    ? existing.benchmarks.map((entry) => [entry.name, entry])
    : [],
);

const baselineEntries = report.benchmarks.map((bench) => {
  const current = existingByName.get(bench.name);
  const fallbackMaxRegressionPct = bench.name === 'inputProxy.update.dirty.realRaycast' ? 35 : 30;
  return {
    name: bench.name,
    baselineMedianNsPerOp: Number(bench.medianNsPerOp.toFixed(2)),
    maxRegressionPct: Number(
      (current?.maxRegressionPct ?? fallbackMaxRegressionPct).toFixed(2),
    ),
  };
});

const baselinePayload = {
  version: 1,
  locked: unlockBaseline ? false : (lockBaseline || existing?.locked === true),
  source: {
    reportGeneratedAt: report.generatedAt ?? null,
    node: report.node ?? null,
    platform: report.platform ?? null,
    arch: report.arch ?? null,
    updatedAt: new Date().toISOString(),
  },
  benchmarks: baselineEntries,
};

if (lockBaseline && !allowNonCiLock) {
  const nodeMajor = typeof report.node === 'string'
    ? Number.parseInt(report.node.replace(/^v/, '').split('.')[0] ?? '0', 10)
    : NaN;
  const platform = typeof report.platform === 'string' ? report.platform : '';
  const isCiLikeSource = platform === 'linux' && nodeMajor === 22;

  if (!isCiLikeSource) {
    console.error('Refusing to lock baseline from non-CI source.');
    console.error(`Detected source platform=${platform || 'unknown'} node=${report.node ?? 'unknown'}`);
    console.error('Use --allow-non-ci-lock to force, but prefer Node 22 Linux CI artifact.');
    process.exit(1);
  }
}

mkdirSync(dirname(outputAbs), { recursive: true });
writeFileSync(outputAbs, `${JSON.stringify(baselinePayload, null, 2)}\n`, 'utf8');

console.log(`Wrote baseline contract: ${outputPath}`);
console.log(`Locked: ${baselinePayload.locked ? 'true' : 'false'}`);

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
