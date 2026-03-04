import { defineConfig } from 'vitest/config';

const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
const isNode18 = nodeMajor < 20;

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: isNode18
      ? [
          'src/integration/browser-export-smoke.jsdom.test.ts',
          'src/integration/browser-export-smoke.happydom.test.ts',
        ]
      : [],
    environment: 'node',
  },
});
