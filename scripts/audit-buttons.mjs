#!/usr/bin/env node
// Static, dependency-free scan of src/ for interactive elements that are
// wired up but don't actually do anything: empty handlers, handlers that
// only log to the console, placeholder alert()/text calling themselves out
// as "mock", and dead `href="#"` links. Regex-based on purpose (no parser
// dependency) — it will miss anything spread across multiple lines in an
// unusual way, so treat findings as leads to check by hand, not gospel.
//
// Usage: node scripts/audit-buttons.mjs [--json]

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC_DIR = join(ROOT, 'src');
const JSON_OUTPUT = process.argv.includes('--json');

const RULES = [
  {
    id: 'empty-handler',
    severity: 'high',
    description: 'Interactive handler with an empty body — the control is wired up but does nothing.',
    pattern: /\bon[A-Z]\w*=\{\s*(?:async\s*)?\([^)]*\)\s*(?::\s*\w+)?\s*=>\s*\{\s*\}\s*\}/g,
  },
  {
    id: 'console-log-only-handler',
    severity: 'high',
    description: 'Interactive handler whose only effect is a console.log — nothing user-visible happens.',
    pattern: /\bon[A-Z]\w*=\{\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{\s*console\.log\([^;]*\);?\s*\}\s*\}/g,
  },
  {
    id: 'empty-named-handler',
    severity: 'high',
    description: 'Named handler function with an empty body.',
    pattern: /\b(?:const|function)\s+handle\w*\s*=?\s*(?:async\s*)?(?:function\s*)?\([^)]*\)\s*(?::\s*\w+)?\s*(?:=>)?\s*\{\s*\}/g,
  },
  {
    id: 'mock-alert',
    severity: 'high',
    description: 'alert() explicitly labelled as a mock/placeholder — a real action never happens.',
    pattern: /alert\(\s*[`'"][^`'"]*(?:\[mock\]|\bmock\b|not implemented|coming soon)[^`'"]*[`'"]/gi,
  },
  {
    id: 'mock-placeholder-copy',
    severity: 'medium',
    description: 'User-facing copy admits the feature behind it is a mock/stub.',
    pattern: /(?:placeholder|title|aria-label)=\{?[`'"][^`'"]*\bmock\b[^`'"]*[`'"]\}?/gi,
  },
  {
    id: 'dead-hash-link',
    severity: 'medium',
    description: 'href="#" with no real destination — a link that goes nowhere.',
    pattern: /href=(["'])#\1/g,
  },
  {
    id: 'todo-comment',
    severity: 'low',
    description: 'TODO/FIXME/HACK/XXX left in source.',
    pattern: /\/\/\s*(?:TODO|FIXME|HACK|XXX)\b.*|\/\*\s*(?:TODO|FIXME|HACK|XXX)\b[\s\S]*?\*\//g,
  },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue;
      walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry) && !entry.endsWith('.test.tsx') && !entry.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

function lineNumberAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function scanFile(path) {
  const text = readFileSync(path, 'utf8');
  const findings = [];
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let match;
    while ((match = rule.pattern.exec(text)) !== null) {
      findings.push({
        rule: rule.id,
        severity: rule.severity,
        description: rule.description,
        line: lineNumberAt(text, match.index),
        snippet: match[0].replace(/\s+/g, ' ').trim().slice(0, 140),
      });
      if (match[0].length === 0) rule.pattern.lastIndex += 1;
    }
  }
  return findings;
}

function severityRank(severity) {
  return { high: 0, medium: 1, low: 2 }[severity] ?? 3;
}

function main() {
  const files = walk(SRC_DIR);
  const results = [];
  for (const file of files) {
    const findings = scanFile(file);
    if (findings.length > 0) {
      results.push({ file: relative(ROOT, file).replace(/\\/g, '/'), findings });
    }
  }

  if (JSON_OUTPUT) {
    process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  } else {
    let total = 0;
    let highCount = 0;
    for (const { file, findings } of results) {
      findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.line - b.line);
      console.log(`\n${file}`);
      for (const finding of findings) {
        total += 1;
        if (finding.severity === 'high') highCount += 1;
        console.log(`  [${finding.severity.toUpperCase()}] line ${finding.line} (${finding.rule}) — ${finding.description}`);
        console.log(`    ${finding.snippet}`);
      }
    }
    console.log(`\n${total} finding(s) across ${results.length} file(s) — ${highCount} high severity.`);
    if (total === 0) {
      console.log('No dead interactive elements found by this pass.');
    }
  }

  const highSeverityFound = results.some((r) => r.findings.some((f) => f.severity === 'high'));
  process.exitCode = highSeverityFound ? 1 : 0;
}

main();
