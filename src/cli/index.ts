#!/usr/bin/env node

// ============================================================================
// SMNTC — CLI
// Lightweight scaffolding and preset helpers.
// ============================================================================

import fs from 'fs';
import path from 'path';

const [, , command, ...rest] = process.argv;

const cwd = process.cwd();

function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(message);
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function init(): void {
  const configPath = path.join(cwd, 'smntc.config.json');
  if (fs.existsSync(configPath)) {
    log('[SMNTC] smntc.config.json already exists.');
    return;
  }

  const defaultConfig = {
    surface: 'topographic',
    vibe: 'calm',
    reactivity: 'static',
    fidelity: 'medium',
    palette: 'monochrome',
    wireframe: true,
    intensity: 1.0,
    speed: 1.0,
    contourLines: 16,
    thermalGuard: true,
  };

  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
  log('[SMNTC] Created smntc.config.json');
}

function addPreset(): void {
  const presetName = rest[0];
  if (!presetName) {
    log('[SMNTC] Usage: smntc add <preset-name>');
    process.exit(1);
  }

  const presetsDir = path.join(cwd, 'smntc-presets');
  ensureDir(presetsDir);

  const presetPath = path.join(presetsDir, `${presetName}.json`);
  if (fs.existsSync(presetPath)) {
    log(`[SMNTC] Preset already exists: ${presetPath}`);
    return;
  }

  const presetTemplate = {
    name: presetName,
    description: 'Custom SMNTC preset',
    defaults: {
      surface: 'fluid',
      vibe: 'calm',
      palette: 'arctic',
      reactivity: 'static',
      fidelity: 'medium',
      wireframe: true,
      intensity: 1.0,
      speed: 1.0,
      contourLines: 16,
    },
    palettes: {},
  };

  fs.writeFileSync(presetPath, JSON.stringify(presetTemplate, null, 2), 'utf8');
  log(`[SMNTC] Created preset template: ${presetPath}`);
}

function preview(): void {
  const src = path.join(cwd, 'examples', 'basic', 'index.html');
  const outDir = path.join(cwd, 'smntc-preview');
  const out = path.join(outDir, 'index.html');

  if (!fs.existsSync(src)) {
    log('[SMNTC] Could not find examples/basic/index.html');
    process.exit(1);
  }

  ensureDir(outDir);
  fs.copyFileSync(src, out);

  log('[SMNTC] Preview ready: smntc-preview/index.html');
  log('[SMNTC] Open the file in your browser or run: npx serve smntc-preview');
}

function help(): void {
  log('SMNTC CLI');
  log('');
  log('Usage:');
  log('  smntc init               Create smntc.config.json');
  log('  smntc add <name>         Create a preset template');
  log('  smntc preview            Copy demo HTML to smntc-preview/');
}

switch (command) {
  case 'init':
    init();
    break;
  case 'add':
    addPreset();
    break;
  case 'preview':
    preview();
    break;
  default:
    help();
    break;
}
