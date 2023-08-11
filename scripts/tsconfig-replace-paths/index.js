#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const fs_1 = require("fs");
const globby_1 = require("globby");
const path_1 = require("path");
const util_1 = require("./util");
program
  .version("0.0.1")
  .option("-p, --project <file>", "path to tsconfig.json")
  .option("-s, --src <path>", "source root path")
  .option("-o, --out <path>", "output root path")
  .option("-v, --verbose", "output logs");
program.on("--help", () => {
  console.log(`
  $ tscpath -p tsconfig.json
`);
});
program.parse(process.argv);
const {
  out: flagOut,
  project = "tsconfig.json",
  src: flagSrc,
  verbose = false,
} = program.opts();
const verboseLog = (...args) => {
  if (verbose) {
    console.log(...args);
  }
};
const configFile = (0, path_1.resolve)(process.cwd(), project);
const rootDir = (0, path_1.resolve)(process.cwd());
verboseLog(`Using tsconfig: ${configFile}`);
const exitingErr = () => {
  throw new Error(
    "--- exiting tsconfig-replace-paths due to parameters missing ---"
  );
};
const missingConfigErr = (property) => {
  console.error(
    `Whoops! Please set ${property} in your tsconfig or supply a flag`
  );
  exitingErr();
};
const missingDirectoryErr = (directory, flag) => {
  console.error(
    `Whoops! ${directory} must be specified in your project => --project ${project}, or flagged with directory => ${flag} './path'`
  );
  exitingErr();
};
const returnedTsConfig = (0, util_1.loadConfig)(configFile);
const {
  baseUrl,
  paths,
  outDir: tsConfigOutDir = "",
  rootDir: tsConfigRootDir = rootDir,
} = returnedTsConfig;
if (!flagSrc && tsConfigRootDir === "") {
  missingConfigErr("compilerOptions.rootDir");
}
if (!flagOut && tsConfigOutDir === "") {
  missingConfigErr("compilerOptions.outDir");
}
let usingSrcDir;
if (flagSrc) {
  verboseLog("Using flag --src");
  usingSrcDir = (0, path_1.resolve)(flagSrc);
} else {
  verboseLog("Using compilerOptions.rootDir from your tsconfig");
  usingSrcDir = (0, path_1.resolve)(tsConfigRootDir);
}
if (!usingSrcDir) {
  missingDirectoryErr("rootDir", "--src");
}
verboseLog(`Using src: ${usingSrcDir}`);
let usingOutDir;
if (flagOut) {
  verboseLog("Using flag --out");
  usingOutDir = (0, path_1.resolve)(flagOut);
} else {
  verboseLog("Using compilerOptions.outDir from your tsconfig");
  usingOutDir = (0, path_1.resolve)(tsConfigOutDir);
}
if (!usingOutDir) {
  missingDirectoryErr("outDir", "--out");
}
verboseLog(`Using out: ${usingOutDir}`);
if (!baseUrl) {
  throw new Error("compilerOptions.baseUrl is not set");
}
if (!paths) {
  throw new Error("compilerOptions.paths is not set");
}
if (!usingOutDir) {
  throw new Error("compilerOptions.outDir is not set");
}
if (!usingSrcDir) {
  throw new Error("compilerOptions.rootDir is not set");
}
verboseLog(`baseUrl: ${baseUrl}`);
verboseLog(`rootDir: ${usingSrcDir}`);
verboseLog(`outDir: ${usingOutDir}`);
verboseLog(`paths: ${JSON.stringify(paths, null, 2)}`);
const configDir = (0, path_1.dirname)(configFile);
const basePath = (0, path_1.resolve)(configDir, baseUrl);
verboseLog(`basePath: ${basePath}`);
const outPath = usingOutDir || (0, path_1.resolve)(basePath, usingOutDir);
verboseLog(`outPath: ${outPath}`);
const outFileToSrcFile = (x) =>
  (0, path_1.resolve)(usingSrcDir, (0, path_1.relative)(outPath, x));
const aliases = Object.keys(paths)
  .map((alias) => ({
    prefix: alias.replace(/\*$/, ""),
    aliasPaths: paths[alias].map((p) =>
      (0, path_1.resolve)(basePath, p.replace(/\*$/, ""))
    ),
  }))
  .filter(({ prefix }) => prefix);
verboseLog(`aliases: ${JSON.stringify(aliases, null, 2)}`);
const toRelative = (from, x) => {
  const rel = (0, path_1.relative)(from, x);
  return (rel.startsWith(".") ? rel : `./${rel}`).replace(/\\/g, "/");
};
const exts = [".js", ".jsx", ".ts", ".tsx", ".d.ts", ".json"];
let replaceCount = 0;
const absToRel = (modulePath, outFile) => {
  const alen = aliases.length;
  for (let j = 0; j < alen; j += 1) {
    const { prefix, aliasPaths } = aliases[j];
    if (modulePath.startsWith(prefix)) {
      const modulePathRel = modulePath.substring(prefix.length);
      const srcFile = outFileToSrcFile(outFile);
      const outRel = (0, path_1.relative)(basePath, outFile);
      verboseLog(
        `${outRel} (source: ${(0, path_1.relative)(basePath, srcFile)}):`
      );
      verboseLog(`\timport '${modulePath}'`);
      const len = aliasPaths.length;
      for (let i = 0; i < len; i += 1) {
        const apath = aliasPaths[i];
        const moduleSrc = (0, path_1.resolve)(apath, modulePathRel);
        for (const ext of exts) {
          const moduleWithExt = moduleSrc + ext;
          if (!(0, fs_1.existsSync)(moduleWithExt)) {
            continue;
          }
          const rel = toRelative(
            (0, path_1.dirname)(srcFile),
            moduleWithExt
          ).replace(/\.[^/.]+$/, "");
          replaceCount += 1;
          verboseLog(
            `\treplacing '${modulePath}' -> '${rel}' referencing ${(0,
            path_1.relative)(basePath, moduleWithExt)}`
          );
          return rel;
        }
        if ((0, fs_1.existsSync)(moduleSrc)) {
          const rel = toRelative((0, path_1.dirname)(srcFile), moduleSrc);
          replaceCount += 1;
          verboseLog(
            `\treplacing '${modulePath}' -> '${rel}' referencing ${(0,
            path_1.relative)(basePath, moduleSrc)}`
          );
          return rel;
        }
      }
      verboseLog(`\tcould not replace ${modulePath}`);
    }
  }
  return modulePath;
};
const requireRegex = /(?:import|require)\(['"]([^'"]*)['"]\)/g;
const importRegex = /(?:import|from) ['"]([^'"]*)['"]/g;
const replaceImportStatement = (orig, matched, outFile) => {
  const index = orig.indexOf(matched);
  return (
    orig.substring(0, index) +
    absToRel(matched, outFile) +
    orig.substring(index + matched.length)
  );
};
const replaceAlias = (text, outFile) =>
  text
    .replace(requireRegex, (orig, matched) =>
      replaceImportStatement(orig, matched, outFile)
    )
    .replace(importRegex, (orig, matched) =>
      replaceImportStatement(orig, matched, outFile)
    );
const files = (0, globby_1.sync)(`${outPath}/**/*.{js,jsx,ts,tsx}`, {
  dot: true,
  noDir: true,
}).map((x) => (0, path_1.resolve)(x));
let changedFileCount = 0;
const flen = files.length;
let count = 0;
for (let i = 0; i < flen; i += 1) {
  const file = files[i];
  const text = (0, fs_1.readFileSync)(file, "utf8");
  const prevReplaceCount = replaceCount;
  const newText = replaceAlias(text, file);
  if (text !== newText) {
    changedFileCount += 1;
    verboseLog(`${file}: replaced ${replaceCount - prevReplaceCount} paths`);
    (0, fs_1.writeFileSync)(file, newText, "utf8");
    count = count + 1;
  }
}
console.log(`Replaced ${replaceCount} paths in ${changedFileCount} files`);
