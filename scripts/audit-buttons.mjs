import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const TARGET_EXTENSIONS = new Set(['.tsx', '.ts', '.jsx', '.js']);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
      continue;
    }
    if (TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function parseButtonIssues(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const issues = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].includes('<button')) continue;

    let tag = lines[i];
    let j = i;
    while (!tag.includes('>') && j + 1 < lines.length) {
      j += 1;
      tag += lines[j];
    }

    const hasOnClick = /\bonClick\s*=/.test(tag);
    const isSubmit = /\btype\s*=\s*["']submit["']/.test(tag);
    const explicitlyDisabled = /\bdisabled\b/.test(tag);
    const previousContext = lines.slice(Math.max(0, i - 4), i + 1).join('\n');
    const nextContext = lines.slice(i, Math.min(lines.length, i + 5)).join('\n');
    const wrappedByLink = /<Link\b/.test(previousContext) || /<Link\b/.test(nextContext);

    if (!hasOnClick && !isSubmit && !explicitlyDisabled && !wrappedByLink) {
      issues.push({ line: i + 1, snippet: lines[i].trim() });
    }

    i = j;
  }

  return issues;
}

const files = walk(SRC_DIR);
const failures = [];

for (const file of files) {
  const issues = parseButtonIssues(file);
  if (issues.length > 0) {
    failures.push({ file, issues });
  }
}

if (failures.length > 0) {
  console.error('Dead-button audit failed. Buttons without handlers were found:\n');
  for (const failure of failures) {
    const relative = path.relative(ROOT, failure.file);
    for (const issue of failure.issues) {
      console.error(`- ${relative}:${issue.line} -> ${issue.snippet}`);
    }
  }
  process.exit(1);
}

console.log('Dead-button audit passed.');

