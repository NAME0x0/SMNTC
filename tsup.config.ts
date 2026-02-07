import { defineConfig } from 'tsup';

export default defineConfig([
  // Core (ESM + CJS)
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['three'],
  },
  // Core (IIFE for CDN)
  {
    entry: { 'index.iife': 'src/index.ts' },
    format: ['iife'],
    globalName: 'SMNTC',
    dts: false,
    sourcemap: true,
    clean: false,
    noExternal: ['three'],
  },
  // React (ESM + CJS)
  {
    entry: { 'react/index': 'src/react/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: false,
    external: ['three', 'react', '@react-three/fiber'],
  },
  // Web component (ESM)
  {
    entry: { 'web/index': 'src/web/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: false,
    external: ['three'],
  },
  // Web component (IIFE for CDN)
  {
    entry: { 'web/index.iife': 'src/web/index.ts' },
    format: ['iife'],
    globalName: 'SMNTCWeb',
    dts: false,
    sourcemap: true,
    clean: false,
    noExternal: ['three'],
  },
  // CLI (CJS)
  {
    entry: { cli: 'src/cli/index.ts' },
    format: ['cjs'],
    dts: false,
    sourcemap: false,
    clean: false,
    platform: 'node',
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
