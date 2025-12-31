#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(process.cwd());
const entryPath = path.join(rootDir, "cli", "jobsnap.js");
const distDir = path.join(rootDir, "dist");
const outputPath = path.join(distDir, "jobsnap.js");

const importRegex = /^import\s+(.+?)\s+from\s+["'](.+?)["'];?\s*$/gm;

function toModuleId(filePath) {
  const rel = path.relative(rootDir, filePath).split(path.sep).join("/");
  return `./${rel}`;
}

function resolveImport(specifier, fromPath) {
  if (!specifier.startsWith(".")) return { specifier, path: null };
  const base = path.resolve(path.dirname(fromPath), specifier);
  const withExt = path.extname(base) ? base : `${base}.js`;
  return { specifier: toModuleId(withExt), path: withExt };
}

function buildRequireLine(clause, specifier) {
  const trimmed = clause.trim();
  if (trimmed.startsWith("{")) {
    return `const ${trimmed} = require(${JSON.stringify(specifier)});`;
  }
  if (trimmed.startsWith("* as ")) {
    const name = trimmed.replace("* as ", "").trim();
    return `const ${name} = require(${JSON.stringify(specifier)});`;
  }
  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
    const defaultName = parts[0];
    const namedPart = parts.slice(1).join(", ");
    return [
      `const ${defaultName} = require(${JSON.stringify(specifier)});`,
      namedPart ? `const ${namedPart} = require(${JSON.stringify(specifier)});` : ""
    ]
      .filter(Boolean)
      .join("\n");
  }
  return `const ${trimmed} = require(${JSON.stringify(specifier)});`;
}

function transformSource(source, filePath) {
  let code = String(source ?? "").replace(/^#!.*\n/, "");

  const imports = [];
  code = code.replace(importRegex, (match, clause, specifier) => {
    const resolved = resolveImport(specifier, filePath);
    if (resolved.path) imports.push(resolved.path);
    const target = resolved.specifier;
    return buildRequireLine(clause, target);
  });

  const exportNames = new Set();
  code = code.replace(/^export\s+const\s+(\w+)/gm, (match, name) => {
    exportNames.add(name);
    return `const ${name}`;
  });
  code = code.replace(/^export\s+async\s+function\s+(\w+)/gm, (match, name) => {
    exportNames.add(name);
    return `async function ${name}`;
  });
  code = code.replace(/^export\s+function\s+(\w+)/gm, (match, name) => {
    exportNames.add(name);
    return `function ${name}`;
  });
  code = code.replace(/^export\s+class\s+(\w+)/gm, (match, name) => {
    exportNames.add(name);
    return `class ${name}`;
  });

  if (exportNames.size > 0) {
    code += `\nmodule.exports = { ${[...exportNames].join(", ")} };\n`;
  }

  return { code, imports };
}

async function buildGraph() {
  const queue = [entryPath];
  const visited = new Map();

  while (queue.length) {
    const filePath = queue.shift();
    if (!filePath || visited.has(filePath)) continue;
    const source = await fs.readFile(filePath, "utf8");
    const { code, imports } = transformSource(source, filePath);
    visited.set(filePath, code);
    for (const dependency of imports) {
      if (!visited.has(dependency)) queue.push(dependency);
    }
  }

  return visited;
}

async function buildBundle() {
  const modules = await buildGraph();
  const lines = [];
  lines.push("#!/usr/bin/env node");
  lines.push("\"use strict\";\n");
  lines.push("const __modules = Object.create(null);");

  for (const [filePath, code] of modules.entries()) {
    const id = toModuleId(filePath);
    lines.push(`__modules[${JSON.stringify(id)}] = (module, exports, require) => {`);
    const indented = code
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n");
    lines.push(indented);
    lines.push("};\n");
  }

  lines.push("const __cache = Object.create(null);");
  lines.push("function __require(id) {");
  lines.push("  if (__cache[id]) return __cache[id].exports;");
  lines.push("  if (!__modules[id]) return require(id);");
  lines.push("  const module = { exports: {} };");
  lines.push("  __cache[id] = module;");
  lines.push("  __modules[id](module, module.exports, __require);");
  lines.push("  return module.exports;");
  lines.push("}\n");
  lines.push(`__require(${JSON.stringify(toModuleId(entryPath))});`);

  await fs.mkdir(distDir, { recursive: true });
  await fs.writeFile(outputPath, lines.join("\n"), "utf8");
  await fs.chmod(outputPath, 0o755);
}

buildBundle().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
