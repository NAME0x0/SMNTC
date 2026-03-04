#!/usr/bin/env node

// ============================================================================
// SMNTC — CLI
// Lightweight scaffolding and preset helpers.
// ============================================================================

import fs from 'fs';
import path from 'path';
import { compileCssTarget } from '../export/css-target';

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

type FlagValue = string | boolean;

function parseArgs(args: string[]): { positional: string[]; flags: Record<string, FlagValue> } {
  const positional: string[] = [];
  const flags: Record<string, FlagValue> = {};

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token) continue;
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }
    positional.push(token);
  }

  return { positional, flags };
}

function loadConfig(configPath?: string): Record<string, unknown> {
  if (!configPath) {
    const defaultPath = path.join(cwd, 'smntc.config.json');
    if (!fs.existsSync(defaultPath)) {
      return {};
    }
    configPath = defaultPath;
  }

  if (!fs.existsSync(configPath)) {
    log(`[SMNTC] Config not found: ${configPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw) as Record<string, unknown>;
}

function exportCss(args: string[]): void {
  const { flags } = parseArgs(args);
  const configPath = typeof flags.config === 'string' ? flags.config : undefined;
  const outPath = typeof flags.out === 'string'
    ? flags.out
    : path.join(cwd, 'smntc.css');
  const svgPath = typeof flags.svg === 'string'
    ? flags.svg
    : path.join(path.dirname(outPath), 'smntc-filters.svg');

  const config = loadConfig(configPath);
  const { cssText, svgDefs } = compileCssTarget(config as any, {
    className: typeof flags.class === 'string' ? flags.class : undefined,
    keyframesName: typeof flags.keyframes === 'string' ? flags.keyframes : undefined,
    idPrefix: typeof flags.id === 'string' ? flags.id : undefined,
    reduceMotion: typeof flags['reduce-motion'] === 'string'
      ? (flags['reduce-motion'] as any)
      : undefined,
  });

  fs.writeFileSync(outPath, cssText, 'utf8');
  log(`[SMNTC] CSS exported to ${outPath}`);

  if (svgDefs.trim().length > 0) {
    fs.writeFileSync(svgPath, svgDefs, 'utf8');
    log(`[SMNTC] SVG filter defs exported to ${svgPath}`);
  }
}

function exportTemplate(args: string[], type: 'video' | 'static'): void {
  const { flags } = parseArgs(args);
  const defaultName = type === 'video'
    ? 'smntc-export-video.js'
    : 'smntc-export-static.js';
  const outPath = typeof flags.out === 'string'
    ? flags.out
    : path.join(cwd, defaultName);

  const template = type === 'video'
    ? buildVideoTemplate()
    : buildStaticTemplate();

  fs.writeFileSync(outPath, template, 'utf8');
  log(`[SMNTC] ${type.toUpperCase()} export template written to ${outPath}`);
}

function buildVideoTemplate(): string {
  return [
    '// SMNTC video export template (browser usage)',
    "import { exportCanvasVideo } from 'smntc';",
    '',
    '// Provide a canvas and optional renderFrame callback that advances your animation.',
    'const canvas = document.querySelector(\'#smntc-canvas\');',
    '',
    'const result = await exportCanvasVideo(canvas, {',
    '  fps: 30,',
    '  durationMs: 6000,',
    '  preferWebCodecs: true,',
    '  // muxer: new Mp4BoxMuxer(), // Optional: supply MP4Box.js muxer',
    '  renderFrame: async (timeMs) => {',
    '    // Advance your animation to timeMs and render.',
    '  },',
    '});',
    '',
    '// result.blob contains the video file. Use URL.createObjectURL to download.',
  ].join('\n');
}

function buildStaticTemplate(): string {
  return [
    '// SMNTC static export template (browser usage)',
    "import { exportCanvasPng, exportSvg } from 'smntc';",
    '',
    'const canvas = document.querySelector(\'#smntc-canvas\');',
    'const png = await exportCanvasPng(canvas, {',
    '  width: 1920,',
    '  height: 1080,',
    '  background: \"#000000\",',
    '  renderFrame: async () => {',
    '    // Ensure the frame is rendered before capture.',
    '  },',
    '});',
    '',
    '// If you have an SVG element to export:',
    'const svgElement = document.querySelector(\'#smntc-svg\');',
    'const svgBlob = exportSvg(svgElement);',
  ].join('\n');
}

function exportCommand(): void {
  const target = rest[0];
  const subArgs = rest.slice(1);
  if (!target) {
    log('[SMNTC] Usage: smntc export <css|video-template|static-template> [options]');
    process.exit(1);
  }

  switch (target) {
    case 'css':
      exportCss(subArgs);
      break;
    case 'video-template':
      exportTemplate(subArgs, 'video');
      break;
    case 'static-template':
      exportTemplate(subArgs, 'static');
      break;
    default:
      log(`[SMNTC] Unknown export target: ${target}`);
      process.exit(1);
  }
}

function help(): void {
  log('SMNTC CLI');
  log('');
  log('Usage:');
  log('  smntc init               Create smntc.config.json');
  log('  smntc add <name>         Create a preset template');
  log('  smntc preview            Copy demo HTML to smntc-preview/');
  log('  smntc export css         Generate CSS/SVG filter output');
  log('  smntc export video-template   Write browser video export template');
  log('  smntc export static-template  Write browser static export template');
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
  case 'export':
    exportCommand();
    break;
  default:
    help();
    break;
}
