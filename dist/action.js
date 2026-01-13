"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/action.ts
var core = __toESM(require("@actions/core"));
var path2 = __toESM(require("path"));

// src/core/scanner.ts
var import_glob = require("glob");
var DEFAULT_INCLUDE_PATTERNS = ["**/*.jsx", "**/*.tsx"];
var DEFAULT_EXCLUDE_PATTERNS = [
  "**/node_modules/**",
  "**/*.test.{js,jsx,ts,tsx}",
  "**/*.spec.{js,jsx,ts,tsx}",
  "**/__tests__/**",
  "**/__mocks__/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**"
];
async function scanFiles(options) {
  const {
    include,
    exclude = DEFAULT_EXCLUDE_PATTERNS,
    cwd = process.cwd()
  } = options;
  const allFiles = /* @__PURE__ */ new Set();
  for (const pattern of include) {
    const matches = await (0, import_glob.glob)(pattern, {
      cwd,
      ignore: exclude,
      nodir: true,
      absolute: false
    });
    for (const match of matches) {
      allFiles.add(match);
    }
  }
  return Array.from(allFiles).sort();
}

// src/core/compiler.ts
var import_core = require("@babel/core");
var BabelParser = __toESM(require("@babel/parser"));
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var DEFAULT_COMPILER_OPTIONS = {
  noEmit: true,
  compilationMode: "infer",
  panicThreshold: "none",
  environment: {
    enableTreatRefLikeIdentifiersAsRefs: true
  }
};
var cachedPlugin;
var pluginLoadFailed = false;
function getPluginVersion(pluginPath) {
  let dir = path.dirname(pluginPath);
  for (let i = 0; i < 5; i++) {
    try {
      const packageJsonPath = path.join(dir, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      if (packageJson.name === "babel-plugin-react-compiler") {
        return packageJson.version || "unknown";
      }
    } catch {
    }
    dir = path.dirname(dir);
  }
  return "unknown";
}
function loadBabelPlugin(workspaceFolder) {
  if (cachedPlugin) {
    return cachedPlugin.plugin;
  }
  if (pluginLoadFailed) {
    return void 0;
  }
  const searchPath = workspaceFolder || process.cwd();
  try {
    const resolvedPath = require.resolve("babel-plugin-react-compiler", {
      paths: [searchPath]
    });
    const plugin = require(resolvedPath);
    const version = getPluginVersion(resolvedPath);
    cachedPlugin = { plugin, version, source: resolvedPath };
    console.log(`Using babel-plugin-react-compiler@${version} from ${resolvedPath}`);
    return plugin;
  } catch (error) {
    pluginLoadFailed = true;
    console.error(
      `
\u274C babel-plugin-react-compiler not found.
   Searched from: ${searchPath}

   Please install it in your project:
     npm install babel-plugin-react-compiler
   or
     pnpm add babel-plugin-react-compiler
`
    );
    return void 0;
  }
}
function getLanguageFromFilename(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ["js", "jsx", "mjs"].includes(ext ?? "") ? "flow" : "typescript";
}
function runBabelPluginReactCompiler(BabelPluginReactCompiler, sourceCode, filename, language) {
  const successfulCompilations = [];
  const failedCompilations = [];
  const logger = {
    logEvent(filenameArg, rawEvent) {
      const event = { ...rawEvent, filename: filenameArg };
      switch (event.kind) {
        case "CompileSuccess": {
          successfulCompilations.push(event);
          return;
        }
        case "CompileError":
        case "CompileDiagnostic":
        case "PipelineError":
          failedCompilations.push(event);
          return;
      }
    }
  };
  const compilerOptions = {
    ...DEFAULT_COMPILER_OPTIONS,
    logger
  };
  const ast = BabelParser.parse(sourceCode, {
    sourceFilename: filename,
    plugins: [language, "jsx"],
    sourceType: "module"
  });
  const result = (0, import_core.transformFromAstSync)(ast, sourceCode, {
    filename,
    highlightCode: false,
    retainLines: true,
    plugins: [[BabelPluginReactCompiler, compilerOptions]],
    sourceType: "module",
    configFile: false,
    babelrc: false
  });
  if (result?.code == null) {
    throw new Error(
      `babel-plugin-react-compiler failed to generate code for ${filename}`
    );
  }
  return {
    successfulCompilations,
    failedCompilations
  };
}
function checkFile(filePath, workspaceFolder) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(workspaceFolder || process.cwd(), filePath);
  let sourceCode;
  try {
    sourceCode = fs.readFileSync(absolutePath, "utf-8");
  } catch (error) {
    return {
      filePath,
      success: false,
      compilationResult: {
        successfulCompilations: [],
        failedCompilations: []
      },
      error: `Failed to read file: ${error?.message}`
    };
  }
  const plugin = loadBabelPlugin(workspaceFolder);
  if (!plugin) {
    return {
      filePath,
      success: false,
      compilationResult: {
        successfulCompilations: [],
        failedCompilations: []
      },
      error: "babel-plugin-react-compiler is not available"
    };
  }
  try {
    const language = getLanguageFromFilename(filePath);
    const compilationResult = runBabelPluginReactCompiler(
      plugin,
      sourceCode,
      absolutePath,
      language
    );
    const hasFailures = compilationResult.failedCompilations.length > 0;
    return {
      filePath,
      success: !hasFailures,
      compilationResult
    };
  } catch (error) {
    return {
      filePath,
      success: false,
      compilationResult: {
        successfulCompilations: [],
        failedCompilations: []
      },
      error: `Compilation error: ${error?.message}`
    };
  }
}
function checkFiles(filePaths, workspaceFolder) {
  return filePaths.map(
    (filePath) => checkFile(filePath, workspaceFolder)
  );
}

// src/reporters/console.ts
var COLORS = {
  reset: "\x1B[0m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  gray: "\x1B[90m",
  bold: "\x1B[1m"
};
function colorize(text, color) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}
function formatConsoleReport(result) {
  const lines = [];
  const { summary, results } = result;
  lines.push("");
  lines.push(colorize("React Compiler Healthcheck Results", "bold"));
  lines.push("\u2550".repeat(50));
  lines.push("");
  const passRate = summary.totalComponents > 0 ? (summary.passedComponents / summary.totalComponents * 100).toFixed(1) : "0.0";
  lines.push(`${colorize("Files scanned:", "blue")} ${summary.totalFiles}`);
  lines.push(`${colorize("Total components:", "blue")} ${summary.totalComponents}`);
  lines.push(`${colorize("Passed:", "green")} ${summary.passedComponents}`);
  lines.push(`${colorize("Failed:", "red")} ${summary.failedComponents}`);
  lines.push(`${colorize("Pass rate:", "blue")} ${passRate}%`);
  lines.push("");
  const failedFiles = results.filter((r) => !r.success || r.error);
  if (failedFiles.length > 0) {
    lines.push(colorize("Failed Components:", "red"));
    lines.push("\u2500".repeat(50));
    for (const file of failedFiles) {
      if (file.error) {
        lines.push(`  ${colorize("\u2717", "red")} ${file.filePath}`);
        lines.push(`    ${colorize(file.error, "gray")}`);
        continue;
      }
      for (const failure of file.compilationResult.failedCompilations) {
        const line = failure.fnLoc?.start?.line ?? "?";
        const name = failure.fnName ?? "anonymous";
        const reason = failure.detail?.reason ?? failure.detail?.description ?? "Unknown reason";
        lines.push(`  ${colorize("\u2717", "red")} ${file.filePath}:${line} - ${colorize(name, "yellow")}`);
        lines.push(`    ${colorize(reason, "gray")}`);
        if (failure.detail?.suggestions?.length) {
          for (const suggestion of failure.detail.suggestions) {
            lines.push(`    ${colorize("\u2192", "blue")} ${suggestion}`);
          }
        }
      }
    }
    lines.push("");
  }
  if (summary.failedComponents === 0 && summary.totalComponents > 0) {
    lines.push(colorize("\u2713 All components are optimized by React Compiler!", "green"));
  } else if (summary.failedComponents > 0) {
    lines.push(colorize(`\u2717 ${summary.failedComponents} component(s) failed optimization`, "red"));
  }
  lines.push("");
  return lines.join("\n");
}

// src/index.ts
async function runHealthcheck(config = {}) {
  const {
    include = DEFAULT_INCLUDE_PATTERNS,
    exclude = DEFAULT_EXCLUDE_PATTERNS,
    cwd = process.cwd()
  } = config;
  console.log("Scanning for React files...");
  const files = await scanFiles({ include, exclude, cwd });
  console.log(`Found ${files.length} files to check`);
  if (files.length === 0) {
    return {
      summary: {
        totalFiles: 0,
        totalComponents: 0,
        passedComponents: 0,
        failedComponents: 0,
        filesWithErrors: 0,
        filesFullyOptimized: 0
      },
      results: []
    };
  }
  console.log("Checking files for React Compiler optimization...");
  const results = checkFiles(files, cwd);
  const summary = calculateSummary(results);
  return {
    summary,
    results
  };
}
function calculateSummary(results) {
  let totalComponents = 0;
  let passedComponents = 0;
  let failedComponents = 0;
  let filesWithErrors = 0;
  let filesFullyOptimized = 0;
  for (const result of results) {
    const { compilationResult, error } = result;
    if (error) {
      filesWithErrors++;
      continue;
    }
    const passed = compilationResult.successfulCompilations.length;
    const failed = compilationResult.failedCompilations.length;
    totalComponents += passed + failed;
    passedComponents += passed;
    failedComponents += failed;
    if (failed > 0) {
      filesWithErrors++;
    } else if (passed > 0) {
      filesFullyOptimized++;
    }
  }
  return {
    totalFiles: results.length,
    totalComponents,
    passedComponents,
    failedComponents,
    filesWithErrors,
    filesFullyOptimized
  };
}

// src/action.ts
function parseInputs() {
  const includeRaw = core.getInput("include") || "**/*.jsx,**/*.tsx";
  const excludeRaw = core.getInput("exclude") || "**/node_modules/**";
  return {
    include: includeRaw.split(",").map((s) => s.trim()).filter(Boolean),
    exclude: excludeRaw.split(",").map((s) => s.trim()).filter(Boolean),
    failOnError: core.getInput("fail-on-error") !== "false",
    failThreshold: parseInt(core.getInput("fail-threshold") || "0", 10),
    workingDirectory: core.getInput("working-directory") || "."
  };
}
async function run() {
  try {
    const inputs = parseInputs();
    const cwd = path2.resolve(inputs.workingDirectory);
    core.info(`Working directory: ${cwd}`);
    core.info(`Include patterns: ${inputs.include.join(", ")}`);
    core.info(`Exclude patterns: ${inputs.exclude.join(", ")}`);
    const result = await runHealthcheck({
      include: inputs.include,
      exclude: inputs.exclude,
      cwd
    });
    const { summary } = result;
    const passRate = summary.totalComponents > 0 ? summary.passedComponents / summary.totalComponents * 100 : 100;
    core.setOutput("total-files", summary.totalFiles.toString());
    core.setOutput("total-components", summary.totalComponents.toString());
    core.setOutput("passed", summary.passedComponents.toString());
    core.setOutput("failed", summary.failedComponents.toString());
    core.setOutput("pass-rate", passRate.toFixed(1));
    console.log(formatConsoleReport(result));
    let shouldFail = false;
    if (inputs.failOnError && summary.failedComponents > 0) {
      shouldFail = true;
    } else if (!inputs.failOnError && inputs.failThreshold > 0) {
      const failRate = 100 - passRate;
      if (failRate > inputs.failThreshold) {
        shouldFail = true;
      }
    }
    core.setOutput("success", (!shouldFail).toString());
    if (shouldFail) {
      core.setFailed(
        `React Compiler healthcheck failed: ${summary.failedComponents} component(s) not optimized`
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred");
    }
  }
}
run();
