import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src', 'docs'];
const EXTRA_FILES = ['AGENTS.md', 'README.md', 'ZIP_IMPORT_GUIDE.md'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.html']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-ssr', '.git']);

const suspiciousPatterns = [
  /[\uFFFD]/,
  /[\uE000-\uF8FF]/,
  /姝|鏃|鐢|诲|瀵|煎|鍒|濆|缂|爜|鍣|璇|瑙|嗛|澶|辫|触|鈫|鉁|鈿|脳/,
];
const allowedExampleLine = /mojibake|These rules exist to prevent/;

const getExtension = (filePath) => {
  const match = filePath.match(/\.[^.]+$/);
  return match ? match[0] : '';
};

const walk = (dir) => {
  const entries = [];

  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;

    const fullPath = join(dir, name);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      entries.push(...walk(fullPath));
    } else if (EXTENSIONS.has(getExtension(fullPath))) {
      entries.push(fullPath);
    }
  }

  return entries;
};

const files = [
  ...SCAN_DIRS.flatMap(dir => walk(join(ROOT, dir))),
  ...EXTRA_FILES.map(file => join(ROOT, file)),
];

const issues = [];

for (const file of files) {
  let text;

  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  text.split(/\r?\n/).forEach((line, index) => {
    if (allowedExampleLine.test(line)) return;

    if (suspiciousPatterns.some(pattern => pattern.test(line))) {
      issues.push({
        file: relative(ROOT, file),
        line: index + 1,
        text: line.trim().slice(0, 160),
      });
    }
  });
}

if (issues.length > 0) {
  console.error('Potential encoding/mojibake issues found:');
  for (const issue of issues) {
    console.error(`- ${issue.file}:${issue.line}: ${issue.text}`);
  }
  process.exit(1);
}

console.log('Encoding check passed.');
