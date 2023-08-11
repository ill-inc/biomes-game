"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = exports.mapPaths = void 0;
const path = require('path');
const fs = require('fs');
const JSON5 = require('json5');
const mapPaths = (paths, mapper) => {
    const dest = {};
    Object.keys(paths).forEach(key => {
        dest[key] = paths[key].map(mapper);
    });
    return dest;
};
exports.mapPaths = mapPaths;
const loadConfig = (file) => {
    const fileToParse = fs.readFileSync(file);
    const parsedJsonFile = JSON5.parse(fileToParse);
    const { extends: extendsPath, compilerOptions: { baseUrl, outDir, rootDir, paths } = {
        baseUrl: undefined,
        outDir: undefined,
        rootDir: undefined,
        paths: undefined,
    }, } = parsedJsonFile;
    const config = {};
    if (baseUrl) {
        config.baseUrl = baseUrl;
    }
    if (outDir) {
        config.outDir = outDir;
    }
    if (rootDir) {
        config.rootDir = rootDir;
    }
    if (paths) {
        config.paths = paths;
    }
    if (extendsPath) {
        const childConfigDirPath = path.dirname(file);
        const parentConfigPath = path.resolve(childConfigDirPath, extendsPath);
        const parentConfigDirPath = path.dirname(parentConfigPath);
        const currentExtension = path.extname(parentConfigPath);
        let parentExtendedConfigFile = path.format({
            name: parentConfigPath,
            ext: currentExtension === '' ? '.json' : '',
        });
        if (/\.json\.json$/.test(parentExtendedConfigFile)) {
            parentExtendedConfigFile = parentExtendedConfigFile.replace(/\.json\.json$/, '.json');
        }
        const parentConfig = (0, exports.loadConfig)(parentExtendedConfigFile);
        if (parentConfig.baseUrl) {
            parentConfig.baseUrl = path.resolve(parentConfigDirPath, parentConfig.baseUrl);
        }
        return Object.assign(Object.assign({}, parentConfig), config);
    }
    return config;
};
exports.loadConfig = loadConfig;
