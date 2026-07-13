import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const ignoreDirs = new Set([
  ".git",
  ".next",
  ".npm-cache",
  ".vercel",
  "coverage",
  "node_modules",
]);
const allowedExtensions = new Set([
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".prisma",
  ".ts",
  ".tsx",
]);
const ignoreFiles = new Set(["src/lib/pdf.ts"]);
const suspiciousPatterns = ["\u00C3", "\u00C4", "\u00C5", "\uFFFD"];
const findings = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    if (!allowedExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, "/");
    if (ignoreFiles.has(relativePath)) {
      continue;
    }

    const source = await readFile(fullPath, "utf8");
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (suspiciousPatterns.some((pattern) => line.includes(pattern))) {
        findings.push(`${relativePath}:${index + 1}: ${line.trim()}`);
      }
    });
  }
}

await walk(rootDir);

if (findings.length > 0) {
  console.error("Suspicious encoding sequences found:");
  findings.forEach((finding) => console.error(finding));
  process.exit(1);
}

console.log("Encoding check passed.");
