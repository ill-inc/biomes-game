#!/usr/bin/env ts-node

import { execSync } from "child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { copySync } from "fs-extra";
import { resolve } from "path";

const VALID_TARGETS = ["viewer", "editor"] as const;

const target = process.argv[
  process.argv.length - 1
] as (typeof VALID_TARGETS)[number];

if (VALID_TARGETS.findIndex((e) => e == target) === -1) {
  throw new Error(`Invalid target ${target}`);
}

const biomesRootDir = resolve(__dirname, "..", "..", "..", "..");
const galoisDir = resolve(biomesRootDir, "src", "galois");
const electronPackageBaseDir = resolve(biomesRootDir, "galois_package");
const dataDir = resolve(galoisDir, "data");
const packageName = `galois-${target}`;
const packageFilename = `${packageName}-win32-x64`;
const electronPackageDir = resolve(electronPackageBaseDir, packageFilename);
const distPath = resolve(biomesRootDir, "dist", "galois", target, "webpack");
const buildExePath = resolve(distPath, "build.exe");

function buildAssetExe() {
  const pythonBuildPath = resolve(galoisDir, "py", "assets", "build.py");
  const cmd = `pyinstaller --onefile "${pythonBuildPath}" --distpath "${distPath}"`;
  console.log("Executing", cmd);
  try {
    execSync(cmd, {
      stdio: "inherit",
    });
  } catch (error: any) {
    console.error(error);
    throw new Error(
      `Error executing ${cmd} -- did you 'pip install pyinstaller' in your venv?`
    );
  }

  if (!existsSync(buildExePath)) {
    throw new Error(`Expected file ${buildExePath} not found!`);
  } else {
    console.log("Build executable is in", buildExePath);
  }
}

function buildTarget() {
  const cmd = `./b galois ${target} build`;
  console.log("Executing", cmd);
  execSync(cmd, {
    cwd: biomesRootDir,
    stdio: "inherit",
  });
}

function packageTarget() {
  // We need to provide electron-packager with a package.json file, which is uses in
  // particular for finding the electron version. So we parse out the electron version
  // from our outer package.json, and inject that into the dist "source" directory.
  const packageJsonPath = resolve(distPath, "package.json");
  const thisPackageData = JSON.parse(
    readFileSync(resolve(biomesRootDir, "package.json"), "utf8")
  );
  console.log(`Generating ${packageJsonPath}`);
  writeFileSync(
    packageJsonPath,
    `
    {
      "name": "${packageName}",
      "version": "1.0.0",
      "description": "Asset generation tools",
      "author": "Global Illumination Inc.",
      "license": "MIT",
      "private": true,
      "main": "main.js",
      "devDependencies": {
        "electron": "${thisPackageData.devDependencies.electron}"
      }
    }
  `
  );

  const cmd = `yarn electron-packager ${distPath} --overwrite --out "${electronPackageBaseDir}"`;
  console.log("Executing", cmd);
  execSync(cmd, {
    cwd: biomesRootDir,
    stdio: "inherit",
  });
  if (!existsSync(electronPackageDir)) {
    throw new Error(`Expected file ${electronPackageDir} not found!`);
  } else {
    console.log("Electron package is in", electronPackageDir);
  }
}

function copyData() {
  const destDir = resolve(electronPackageDir, "data");
  console.log("Copying data to", destDir);
  copySync(dataDir, destDir);
}

console.log(`Building '${target}'`);
buildTarget();

try {
  console.log("Building python package from", galoisDir);
  buildAssetExe();
  console.log("Packaging into electron app");
  packageTarget();
} finally {
  try {
    rmSync(buildExePath);
  } catch (error: any) {}
}

console.log("Copying data into output folder");
copyData();

console.log();
console.log();
console.log("All done!");
console.log("Package available in", electronPackageDir);
