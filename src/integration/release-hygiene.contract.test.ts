import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type PackageJson = {
  version: string;
  files?: string[];
  exports?: Record<string, unknown>;
  scripts?: Record<string, string>;
  engines?: Record<string, string>;
};

const EXPECTED_SOURCE_TYPES = ['geometry', 'image', 'svg', 'text'] as const;

function loadJson<T>(relativePath: string): T {
  const raw = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  return JSON.parse(raw) as T;
}

function extractQuotedLiterals(text: string): string[] {
  const values = [...text.matchAll(/'([^']+)'/g)].map((match) => match[1] ?? '');
  return Array.from(new Set(values)).sort();
}

function extractSchemaSourceTypes(schema: Record<string, any>): string[] {
  const sourceConfig = schema.$defs?.sourceConfig as { oneOf: Array<{ $ref: string }> } | undefined;
  if (!sourceConfig) {
    return [];
  }

  const values = sourceConfig.oneOf
    .map(({ $ref }) => {
      const defName = $ref.split('/').pop() ?? '';
      return schema.$defs?.[defName]?.properties?.type?.const as string;
    })
    .filter(Boolean);

  return Array.from(new Set(values)).sort();
}

describe('release hygiene contract', () => {
  it('publishes canonical v2 schema artifact and schema exports', () => {
    const packageJson = loadJson<PackageJson>('../../package.json');
    const files = packageJson.files ?? [];
    const exportsField = packageJson.exports ?? {};

    expect(files).toContain('smntc.schema.v2.json');
    expect(files).toContain('smntc.schema.json');

    expect(exportsField['./schema']).toEqual({ default: './smntc.schema.v2.json' });
    expect(exportsField['./schema/v2']).toEqual({ default: './smntc.schema.v2.json' });
    expect(exportsField['./schema/v1']).toEqual({ default: './smntc.schema.json' });
  });

  it('keeps source type contract in parity across schema, types, and factory', () => {
    const schema = loadJson<Record<string, any>>('../../smntc.schema.v2.json');
    const sourceTypesTs = readFileSync(new URL('../source/types.ts', import.meta.url), 'utf8');
    const sourceFactoryTs = readFileSync(new URL('../source/factory.ts', import.meta.url), 'utf8');

    const schemaTypes = extractSchemaSourceTypes(schema);
    const unionTypes = extractQuotedLiterals(
      sourceTypesTs.match(/export type SourceType = ([^;]+);/)?.[1] ?? '',
    );
    const factoryTypes = extractQuotedLiterals(
      sourceFactoryTs.match(/switch \(config\.type\) \{([\s\S]+?)default:/)?.[1] ?? '',
    );

    expect(schemaTypes).toEqual([...EXPECTED_SOURCE_TYPES]);
    expect(unionTypes).toEqual([...EXPECTED_SOURCE_TYPES]);
    expect(factoryTypes).toEqual([...EXPECTED_SOURCE_TYPES]);
    expect(schemaTypes).not.toContain('model');
    expect(unionTypes).not.toContain('model');
    expect(factoryTypes).not.toContain('model');
  });

  it('keeps README contract messaging explicit about canonical v2 and legacy v1 schema', () => {
    const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
    expect(readme).toContain('Canonical machine-validatable schema for `SMNTCConfigV2`');
    expect(readme).toContain('[`smntc.schema.v2.json`](smntc.schema.v2.json)');
    expect(readme).toContain('Legacy v1 schema');
    expect(readme).toContain('[`smntc.schema.json`](smntc.schema.json)');
  });

  it('keeps vanilla template dependency aligned to current package version', () => {
    const packageJson = loadJson<PackageJson>('../../package.json');
    const templatePackage = loadJson<{ dependencies?: Record<string, string> }>('../../templates/vanilla/package.json');
    const templateVersion = templatePackage.dependencies?.smntc;

    expect(templateVersion).toBe(`^${packageJson.version}`);
  });

  it('keeps perf budget and baseline contracts in parity with script wiring', () => {
    const packageJson = loadJson<PackageJson>('../../package.json');
    const perfBudgetContract = loadJson<{ benchmarks?: Array<{ name: string }> }>('../../perf.budgets.json');
    const perfBaselineContract = loadJson<{
      locked?: boolean;
      benchmarks?: Array<{ name: string; maxRegressionPct: number; baselineMedianNsPerOp: number }>;
    }>('../../perf.baseline.json');

    const budgetNames = (perfBudgetContract.benchmarks ?? []).map((bench) => bench.name).sort();
    const baselineEntries = perfBaselineContract.benchmarks ?? [];
    const baselineNames = baselineEntries.map((bench) => bench.name).sort();
    const scripts = packageJson.scripts ?? {};

    expect(scripts['perf:budget']).toContain('--baseline perf.baseline.json');
    expect(scripts['perf:budget:report']).toContain('--baseline perf.baseline.json');
    expect(scripts['perf:summary']).toContain('perf-summary.mjs');
    expect(scripts['perf:baseline:update']).toContain('perf-baseline.mjs');
    expect(scripts['perf:baseline:lock']).toContain('--lock');
    expect(scripts['perf:baseline:unlock']).toContain('--unlock');

    expect(perfBaselineContract.locked).toBeTypeOf('boolean');
    expect(budgetNames).toEqual(baselineNames);

    for (const entry of baselineEntries) {
      expect(entry.maxRegressionPct).toBeGreaterThanOrEqual(20);
      expect(entry.maxRegressionPct).toBeLessThanOrEqual(35);
      expect(entry.baselineMedianNsPerOp).toBeGreaterThan(0);
    }
  });

  it('keeps runtime policy aligned to Node 20+ tooling and CI matrix', () => {
    const packageJson = loadJson<PackageJson>('../../package.json');
    const ciWorkflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');

    expect(packageJson.engines?.node).toBe('>=20');
    expect(ciWorkflow).toContain('node-version: [20, 22]');
    expect(ciWorkflow).not.toContain('node-version: [18');
  });
});
