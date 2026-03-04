#!/usr/bin/env node

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import {
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Vector3,
} from 'three';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const distEntry = resolve(rootDir, 'dist/index.mjs');
const budgetsPath = resolve(rootDir, 'perf.budgets.json');
const args = process.argv.slice(2);
const checkMode = args.includes('--check');
const jsonOutputPath = getOptionValue(args, '--json');
const baselinePath = getOptionValue(args, '--baseline');
const baselineContractPath = baselinePath ? resolve(rootDir, baselinePath) : null;

if (!existsSync(distEntry)) {
  console.error('Missing dist/index.mjs. Run `npm run build` before perf benchmarks.');
  process.exit(1);
}

if (!existsSync(budgetsPath)) {
  console.error('Missing perf.budgets.json benchmark contract.');
  process.exit(1);
}

if (baselineContractPath && !existsSync(baselineContractPath)) {
  console.error(`Missing baseline contract at: ${baselinePath}`);
  process.exit(1);
}

const { AutoScaler, InputProxy } = await import(pathToFileURL(distEntry).href);
const rawBudgets = readFileSync(budgetsPath, 'utf8');
const budgetContract = JSON.parse(rawBudgets);
const baselineContract = baselineContractPath
  ? JSON.parse(readFileSync(baselineContractPath, 'utf8'))
  : null;

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

/**
 * @typedef {Object} BenchSpec
 * @property {string} name
 * @property {number} iterations
 * @property {number} warmupIterations
 * @property {number} samples
 * @property {number} maxMedianNsPerOp
 * @property {number} tolerance
 */

/**
 * @typedef {Object} BaselineSpec
 * @property {string} name
 * @property {number} baselineMedianNsPerOp
 * @property {number} maxRegressionPct
 */

/**
 * @typedef {Object} BenchDefinition
 * @property {() => any} setup
 * @property {(state: any, i: number) => void} run
 * @property {(state: any) => void} teardown
 */

const POINT = new Vector3(1, 2, 3);

function createWindowStub() {
  return {
    addEventListener() {},
    removeEventListener() {},
  };
}

function ensureWindowStub() {
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = createWindowStub();
  }
}

function createDomElement() {
  const listeners = new Map();

  return {
    domElement: {
      addEventListener(type, handler) {
        listeners.set(type, handler);
      },
      removeEventListener(type) {
        listeners.delete(type);
      },
      getBoundingClientRect() {
        return {
          left: 0,
          top: 0,
          width: 100,
          height: 100,
        };
      },
    },
    emit(type, event) {
      const handler = listeners.get(type);
      if (handler) handler(event);
    },
  };
}

function createUniforms() {
  return {
    uPointer: { value: new Vector3() },
    uShockTime: { value: 0 },
  };
}

function createRaycaster() {
  return {
    setFromCamera() {},
    intersectObject(_mesh, _recursive, target) {
      if (target) {
        target.push({ point: POINT });
        return target;
      }
      return [{ point: POINT }];
    },
  };
}

function createRealRaycastState() {
  ensureWindowStub();
  const { domElement, emit } = createDomElement();
  const uniforms = createUniforms();
  const camera = new PerspectiveCamera(60, 1, 0.1, 10);
  camera.position.set(0, 0, 2);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const geometry = new PlaneGeometry(1, 1, 1, 1);
  const material = new MeshBasicMaterial();
  const mesh = new Mesh(geometry, material);
  mesh.updateMatrixWorld(true);

  const proxy = new InputProxy({
    domElement,
    camera,
    raycaster: new Raycaster(),
    mesh,
    uniforms,
    enableShockwave: false,
  });

  // Consume the constructor's initial dirty state.
  proxy.update(0);

  return { proxy, emit, geometry, material };
}

/** @type {Record<string, BenchDefinition>} */
const BENCHMARKS = {
  'autoscaler.reportFrame': {
    setup() {
      return {
        scaler: new AutoScaler('medium', {
          targetFrameTime: 16.6,
          sampleWindow: 30,
          downgradeThreshold: 10_000_000,
          upgradeThreshold: 10_000_000,
          enabled: true,
        }),
      };
    },
    run(state, i) {
      const frameDelta = 16.6 + ((i % 7) - 3) * 0.15;
      state.scaler.reportFrame(frameDelta);
    },
    teardown(state) {
      state.scaler.dispose();
    },
  },

  'inputProxy.update.clean': {
    setup() {
      ensureWindowStub();
      const { domElement } = createDomElement();
      const uniforms = createUniforms();
      const raycaster = createRaycaster();
      const proxy = new InputProxy({
        domElement,
        camera: {},
        raycaster,
        mesh: {},
        uniforms,
        enableShockwave: false,
      });

      // Consume the constructor's initial dirty state.
      proxy.update(0);
      return { proxy };
    },
    run(state, i) {
      state.proxy.update(i * 0.016);
    },
    teardown(state) {
      state.proxy.dispose();
    },
  },

  'inputProxy.update.dirty': {
    setup() {
      ensureWindowStub();
      const { domElement, emit } = createDomElement();
      const uniforms = createUniforms();
      const raycaster = createRaycaster();
      const proxy = new InputProxy({
        domElement,
        camera: {},
        raycaster,
        mesh: {},
        uniforms,
        enableShockwave: false,
      });

      proxy.update(0);
      return { proxy, emit };
    },
    run(state, i) {
      const cx = 10 + (i % 90);
      const cy = 10 + ((i * 3) % 90);
      state.emit('pointermove', { clientX: cx, clientY: cy });
      state.proxy.update(i * 0.016);
    },
    teardown(state) {
      state.proxy.dispose();
    },
  },

  'inputProxy.update.dirty.realRaycast': {
    setup() {
      return createRealRaycastState();
    },
    run(state, i) {
      // Keep pointer near the center so each raycast intersects the test plane.
      const cx = 40 + (i % 20);
      const cy = 40 + ((i * 3) % 20);
      state.emit('pointermove', { clientX: cx, clientY: cy });
      state.proxy.update(i * 0.016);
    },
    teardown(state) {
      state.proxy.dispose();
      state.geometry.dispose();
      state.material.dispose();
    },
  },
};

/**
 * @param {number[]} values
 * @returns {number}
 */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * @param {BenchSpec} spec
 * @returns {{
 *   name: string;
 *   budgetNsPerOp: number;
 *   samples: number;
 *   iterations: number;
 *   medianNsPerOp: number;
 *   meanNsPerOp: number;
 *   maxAllowedNsPerOp: number;
 *   sampleNsPerOp: number[];
 * }}
 */
function runBenchmark(spec) {
  const bench = BENCHMARKS[spec.name];
  if (!bench) {
    throw new Error(`No benchmark definition found for "${spec.name}"`);
  }

  const sampleNsPerOp = [];
  for (let sample = 0; sample < spec.samples; sample++) {
    const state = bench.setup();

    for (let i = 0; i < spec.warmupIterations; i++) {
      bench.run(state, i);
    }

    const start = performance.now();
    for (let i = 0; i < spec.iterations; i++) {
      bench.run(state, i);
    }
    const elapsedMs = performance.now() - start;
    bench.teardown(state);

    const nsPerOp = (elapsedMs * 1e6) / spec.iterations;
    sampleNsPerOp.push(nsPerOp);
  }

  return {
    name: spec.name,
    budgetNsPerOp: spec.maxMedianNsPerOp,
    samples: spec.samples,
    iterations: spec.iterations,
    medianNsPerOp: median(sampleNsPerOp),
    meanNsPerOp: sampleNsPerOp.reduce((sum, n) => sum + n, 0) / sampleNsPerOp.length,
    maxAllowedNsPerOp: spec.maxMedianNsPerOp * spec.tolerance,
    sampleNsPerOp,
  };
}

/**
 * @param {ReturnType<typeof runBenchmark>[]} results
 */
function printBudgetResults(results) {
  const nameWidth = Math.max(
    'Benchmark'.length,
    ...results.map((result) => result.name.length),
  );

  const header = [
    'Benchmark'.padEnd(nameWidth),
    'Median ns/op'.padStart(14),
    'Mean ns/op'.padStart(12),
    'Allowed ns/op'.padStart(14),
  ].join('  ');

  console.log(header);
  console.log('-'.repeat(header.length));

  for (const result of results) {
    console.log([
      result.name.padEnd(nameWidth),
      result.medianNsPerOp.toFixed(2).padStart(14),
      result.meanNsPerOp.toFixed(2).padStart(12),
      result.maxAllowedNsPerOp.toFixed(2).padStart(14),
    ].join('  '));
  }
}

/**
 * @param {ReturnType<typeof runBenchmark>[]} results
 * @param {{
 *   locked: boolean;
 *   comparisons: Map<string, {
 *     missing: boolean;
 *     baselineMedianNsPerOp?: number;
 *     maxRegressionPct?: number;
 *     allowedNsPerOp?: number;
 *     regressionPct?: number;
 *     pass?: boolean;
 *   }>;
 * } | null} baselineEvaluation
 */
function printBaselineResults(results, baselineEvaluation) {
  if (!baselineEvaluation) return;

  const status = baselineEvaluation.locked
    ? 'ENABLED'
    : 'DISABLED (baseline contract unlocked)';
  console.log(`\nBaseline regression checks: ${status}`);

  const nameWidth = Math.max(
    'Benchmark'.length,
    ...results.map((result) => result.name.length),
  );
  const header = [
    'Benchmark'.padEnd(nameWidth),
    'Baseline'.padStart(12),
    'Delta %'.padStart(10),
    'Max %'.padStart(8),
    'Status'.padStart(8),
  ].join('  ');
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const result of results) {
    const comparison = baselineEvaluation.comparisons.get(result.name);
    if (!comparison || comparison.missing) {
      console.log([
        result.name.padEnd(nameWidth),
        '-'.padStart(12),
        '-'.padStart(10),
        '-'.padStart(8),
        (baselineEvaluation.locked ? 'MISSING' : 'n/a').padStart(8),
      ].join('  '));
      continue;
    }

    const deltaPct = comparison.regressionPct ?? 0;
    const statusLabel = baselineEvaluation.locked
      ? (comparison.pass ? 'pass' : 'FAIL')
      : 'n/a';
    console.log([
      result.name.padEnd(nameWidth),
      comparison.baselineMedianNsPerOp.toFixed(2).padStart(12),
      `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(2)}`.padStart(10),
      comparison.maxRegressionPct.toFixed(2).padStart(8),
      statusLabel.padStart(8),
    ].join('  '));
  }
}

/**
 * @param {ReturnType<typeof runBenchmark>[]} results
 * @param {{ locked?: boolean; benchmarks?: BaselineSpec[] } | null} baseline
 * @returns {{
 *   locked: boolean;
 *   comparisons: Map<string, {
 *     missing: boolean;
 *     baselineMedianNsPerOp?: number;
 *     maxRegressionPct?: number;
 *     allowedNsPerOp?: number;
 *     regressionPct?: number;
 *     pass?: boolean;
 *   }>;
 *   failures: string[];
 * } | null}
 */
function evaluateBaseline(results, baseline) {
  if (!baseline) return null;
  if (!Array.isArray(baseline.benchmarks)) {
    throw new Error('Invalid baseline contract: missing "benchmarks" array.');
  }

  const locked = baseline.locked === true;
  const failures = [];
  const comparisons = new Map();
  const baselineByName = new Map();

  for (const entry of baseline.benchmarks) {
    const baselineNs = Number(entry.baselineMedianNsPerOp);
    const maxRegressionPct = Number(entry.maxRegressionPct);
    if (!Number.isFinite(baselineNs) || baselineNs <= 0) {
      throw new Error(`Invalid baselineMedianNsPerOp for "${entry.name}"`);
    }
    if (!Number.isFinite(maxRegressionPct) || maxRegressionPct < 0) {
      throw new Error(`Invalid maxRegressionPct for "${entry.name}"`);
    }
    baselineByName.set(entry.name, { baselineNs, maxRegressionPct });
  }

  for (const result of results) {
    const entry = baselineByName.get(result.name);
    if (!entry) {
      comparisons.set(result.name, { missing: true });
      if (locked) {
        failures.push(`- ${result.name}: missing baseline entry`);
      }
      continue;
    }

    const allowedNsPerOp = entry.baselineNs * (1 + entry.maxRegressionPct / 100);
    const regressionPct = ((result.medianNsPerOp / entry.baselineNs) - 1) * 100;
    const pass = result.medianNsPerOp <= allowedNsPerOp;
    comparisons.set(result.name, {
      missing: false,
      baselineMedianNsPerOp: entry.baselineNs,
      maxRegressionPct: entry.maxRegressionPct,
      allowedNsPerOp,
      regressionPct,
      pass,
    });

    if (locked && !pass) {
      failures.push(
        `- ${result.name}: median ${result.medianNsPerOp.toFixed(2)} ns/op is +${regressionPct.toFixed(2)}% vs baseline (max +${entry.maxRegressionPct.toFixed(2)}%)`,
      );
    }
  }

  if (locked) {
    for (const name of baselineByName.keys()) {
      if (!results.some((result) => result.name === name)) {
        failures.push(`- ${name}: baseline contains benchmark not produced by current run`);
      }
    }
  }

  return { locked, comparisons, failures };
}

if (!budgetContract || !Array.isArray(budgetContract.benchmarks)) {
  console.error('Invalid perf.budgets.json: missing "benchmarks" array.');
  process.exit(1);
}

const results = budgetContract.benchmarks.map((spec) => runBenchmark(spec));
const baselineEvaluation = evaluateBaseline(results, baselineContract);
printBudgetResults(results);
printBaselineResults(results, baselineEvaluation);

if (jsonOutputPath) {
  const outputPath = resolve(rootDir, jsonOutputPath);
  mkdirSync(dirname(outputPath), { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    checkMode,
    budgetsVersion: budgetContract.version ?? null,
    baseline: baselineEvaluation
      ? {
          enabled: true,
          locked: baselineEvaluation.locked,
          source: baselineContract?.source ?? null,
        }
      : {
          enabled: false,
          locked: false,
          source: null,
        },
    benchmarks: results.map((result) => {
      const baselineComparison = baselineEvaluation?.comparisons.get(result.name);
      return {
        name: result.name,
        iterations: result.iterations,
        samples: result.samples,
        budgetNsPerOp: result.budgetNsPerOp,
        allowedNsPerOp: result.maxAllowedNsPerOp,
        medianNsPerOp: result.medianNsPerOp,
        meanNsPerOp: result.meanNsPerOp,
        pass: result.medianNsPerOp <= result.maxAllowedNsPerOp,
        sampleNsPerOp: result.sampleNsPerOp,
        baselineMedianNsPerOp: baselineComparison?.baselineMedianNsPerOp ?? null,
        baselineAllowedNsPerOp: baselineComparison?.allowedNsPerOp ?? null,
        baselineMaxRegressionPct: baselineComparison?.maxRegressionPct ?? null,
        baselineRegressionPct: baselineComparison?.regressionPct ?? null,
        baselinePass: baselineComparison?.pass ?? null,
      };
    }),
  };
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`\nWrote perf report JSON: ${jsonOutputPath}`);
}

if (!checkMode) {
  process.exit(0);
}

const budgetFailures = results.filter((result) => result.medianNsPerOp > result.maxAllowedNsPerOp);
let hasFailures = false;

if (budgetFailures.length > 0) {
  console.error('\nPerformance budget regression detected:\n');
  for (const failure of budgetFailures) {
    console.error(
      `- ${failure.name}: median ${failure.medianNsPerOp.toFixed(2)} ns/op > allowed ${failure.maxAllowedNsPerOp.toFixed(2)} ns/op`,
    );
  }
  hasFailures = true;
}

if (baselineEvaluation && baselineEvaluation.locked && baselineEvaluation.failures.length > 0) {
  console.error('\nBaseline regression detected:\n');
  for (const failure of baselineEvaluation.failures) {
    console.error(failure);
  }
  hasFailures = true;
}

if (hasFailures) {
  process.exit(1);
}

console.log('\nPerformance budgets passed.');
if (baselineEvaluation?.locked) {
  console.log('Baseline regression checks passed.');
} else if (baselineEvaluation) {
  console.log('Baseline regression checks skipped (baseline not locked).');
}
