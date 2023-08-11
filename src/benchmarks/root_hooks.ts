import fs from "fs";
import path from "path";
import * as v8pn from "v8-profiler-next";

// Convert a string into a filename-safe string, by replacing invalid
// filename characters with underscores.
function filenameSafeString(s: string): string {
  const INVALID_CHARACTERS_RE = /[^a-z0-9\-]/gi;

  return s.replaceAll(INVALID_CHARACTERS_RE, "_").toLowerCase();
}

// Follow the ancestor links up the test suites to fully qualify the test's
// path, and return a string representing this separated by "-" symbols.
function fullyQualifiedTestName(test: Mocha.Test) {
  const fullyQualifiedTitle: string[] = [test.title];

  let currentAncestorSuite = test.parent;
  while (currentAncestorSuite && !currentAncestorSuite.root) {
    fullyQualifiedTitle.push(currentAncestorSuite.title);
    currentAncestorSuite = currentAncestorSuite.parent;
  }

  return fullyQualifiedTitle.reverse().join("-");
}

// The folder where all the detailed benchmark output will be placed, relative
// to ${workspaceFolder}.
const DETAILED_OUTPUT_DIR = "v8_profiler_benchmarks_results";

// The before hooks may add a few items to the benchmark `this` context. AFAIK,
// this is the only way to communicate information between the before hooks, the
// after hooks, and the test logic itself.
interface V8ProfilerBenchmarkContext {
  profilingTitle: string;
}

export const mochaHooks = {
  beforeAll() {
    // Create the detailed output director if it doesn't already exist before
    // running any of the tests.
    if (!fs.existsSync(DETAILED_OUTPUT_DIR)) {
      fs.mkdirSync(DETAILED_OUTPUT_DIR);
    }
  },

  beforeEach() {
    const mochaContext = this as unknown as Mocha.Context;
    const benchmarkContext = this as unknown as V8ProfilerBenchmarkContext;

    // Set the title of the benchmark, and save it to the context so that
    // we can pull it out and use it in the `afterEach` hook.
    benchmarkContext.profilingTitle = fullyQualifiedTestName(
      mochaContext.currentTest!
    );

    // Explicitly do a garbage collection run before we start profiling, to
    // keep it out of the results since it's quite significant for smaller
    // tests. Doing this also removes a source of variance from the results.
    if (global.gc) {
      global.gc();
    } else {
      console.error("Expected global.gc() to be exposed.");
      process.exit();
    }

    // Setting generateType to 1 to generate new format for cpuprofile that is
    // compatible with cpuprofile parsing in vscode.
    v8pn.setGenerateType(1);
    v8pn.startProfiling(benchmarkContext.profilingTitle);
  },

  afterEach() {
    const benchmarkContext = this as unknown as V8ProfilerBenchmarkContext;
    const profile = v8pn.stopProfiling(benchmarkContext.profilingTitle);

    profile.export(function (error, result) {
      // Save the detailed output to a file so that it can be inspected offline.
      // It can be viewed in either VS Code directly, or in Chrome.
      fs.writeFileSync(
        path.join(
          DETAILED_OUTPUT_DIR,
          filenameSafeString(benchmarkContext.profilingTitle) + `.cpuprofile`
        ),
        result!
      );
      profile.delete();
    });
  },

  afterAll() {
    // When all benchmarks are done running, log some text so the user knows
    // where to find the results.
    console.log(
      `Detailed results can be found in \${workspaceFolder}/${DETAILED_OUTPUT_DIR}/.`
    );
  },
};
