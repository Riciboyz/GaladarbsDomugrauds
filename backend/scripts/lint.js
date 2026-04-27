#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const includeDirs = ['config', 'database', 'helpers', 'middleware', 'routes', 'scripts', 'tests'];
const ignoreDirs = new Set(['node_modules', 'uploads']);
const files = [];

function collectJsFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) collectJsFiles(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
  }
}

for (const rel of includeDirs) collectJsFiles(path.join(root, rel));
const serverPath = path.join(root, 'server.js');
if (fs.existsSync(serverPath)) files.push(serverPath);

if (!files.length) {
  console.log('No JavaScript files found for lint.');
  process.exit(0);
}

let hasErrors = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) hasErrors = true;
}

if (hasErrors) {
  process.exit(1);
}

console.log(`Lint OK: ${files.length} file(s) checked.`);
