/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "shared-restrict-deps",
      severity: "error",
      comment:
        "Modules in shared folders should not depend on client/server modules.",
      from: {
        path: ["^src/shared/"],
        pathNot: "/test/",
      },
      to: {
        path: "^src",
        pathNot: [
          "^src/shared/",
          "^src/gen/shared/",
          "^src/third-party/",
          "^src/cayley/",
          "^src/galois/js/interface/asset_paths.ts",
          "^src/galois/js/assets/",
        ],
      },
    },
    {
      name: "third-party-restrict-deps",
      severity: "error",
      comment:
        "Modules in src/shared should not depend on modules outside of src/shared.",
      from: {
        path: ["^src/third-party"],
      },
      to: {
        path: "^src",
        pathNot: ["^src/third-party"],
      },
    },
    {
      name: "galois-restrict-deps",
      severity: "error",
      comment:
        "Modules in src/galois/js should not depend on modules outside of src/shared.",
      from: {
        path: "^src/galois/js",
        pathNot: ["^src/galois/js/publish", "^src/galois/js/interface"],
      },
      to: {
        path: "^src",
        pathNot: ["^src/shared", "^src/gen/(shared|galois)", "^src/galois/js"],
      },
    },
  ],

  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      mainFields: ["main", "types"],
    },
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/[^/]+",
      },
      archi: {
        collapsePattern:
          "^(packages|src|lib|app|bin|test(s?)|spec(s?))/[^/]+|node_modules/[^/]+",
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};
