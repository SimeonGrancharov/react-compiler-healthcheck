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
var core2 = __toESM(require("@actions/core"));
var github = __toESM(require("@actions/github"));
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
function loadBabelPlugin(workspaceFolder, babelPluginPath) {
  if (cachedPlugin) {
    return cachedPlugin;
  }
  if (workspaceFolder) {
    const fullPath = path.join(workspaceFolder, babelPluginPath);
    try {
      cachedPlugin = require(fullPath);
      return cachedPlugin;
    } catch (error2) {
      console.warn(
        `Could not load babel-plugin-react-compiler from ${fullPath}: ${error2?.message}`
      );
    }
  }
  try {
    cachedPlugin = require("babel-plugin-react-compiler");
    return cachedPlugin;
  } catch (error2) {
    console.error(
      `Failed to load babel-plugin-react-compiler: ${error2?.message}`
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
function checkFile(filePath, workspaceFolder, babelPluginPath = "node_modules/babel-plugin-react-compiler") {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(workspaceFolder || process.cwd(), filePath);
  let sourceCode;
  try {
    sourceCode = fs.readFileSync(absolutePath, "utf-8");
  } catch (error2) {
    return {
      filePath,
      success: false,
      compilationResult: {
        successfulCompilations: [],
        failedCompilations: []
      },
      error: `Failed to read file: ${error2?.message}`
    };
  }
  const plugin = loadBabelPlugin(workspaceFolder, babelPluginPath);
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
  } catch (error2) {
    return {
      filePath,
      success: false,
      compilationResult: {
        successfulCompilations: [],
        failedCompilations: []
      },
      error: `Compilation error: ${error2?.message}`
    };
  }
}
function checkFiles(filePaths, workspaceFolder, babelPluginPath) {
  return filePaths.map(
    (filePath) => checkFile(filePath, workspaceFolder, babelPluginPath)
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

// src/reporters/markdown.ts
function formatMarkdownReport(result, options = {}) {
  const { repoUrl, commitSha, showSuccesses = false } = options;
  const { summary, results } = result;
  const lines = [];
  const passRate = summary.totalComponents > 0 ? (summary.passedComponents / summary.totalComponents * 100).toFixed(1) : "0.0";
  const statusEmoji = summary.failedComponents === 0 ? "\u2705" : "\u274C";
  lines.push(`## ${statusEmoji} React Compiler Healthcheck`);
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Files scanned | ${summary.totalFiles} |`);
  lines.push(`| Total components | ${summary.totalComponents} |`);
  lines.push(`| Passed | ${summary.passedComponents} |`);
  lines.push(`| Failed | ${summary.failedComponents} |`);
  lines.push(`| Pass rate | ${passRate}% |`);
  lines.push("");
  const failedFiles = results.filter(
    (r) => r.compilationResult.failedCompilations.length > 0 || r.error
  );
  if (failedFiles.length > 0) {
    lines.push("<details>");
    lines.push(`<summary>\u274C Failed Components (${summary.failedComponents})</summary>`);
    lines.push("");
    for (const file of failedFiles) {
      if (file.error) {
        lines.push(`#### \`${file.filePath}\``);
        lines.push(`> \u26A0\uFE0F ${file.error}`);
        lines.push("");
        continue;
      }
      for (const failure of file.compilationResult.failedCompilations) {
        const line = failure.fnLoc?.start?.line ?? 0;
        const name = failure.fnName ?? "anonymous";
        const reason = failure.detail?.reason ?? failure.detail?.description ?? "Unknown reason";
        const fileLink = formatFileLink(file.filePath, line, repoUrl, commitSha);
        lines.push(`#### ${fileLink} - \`${name}\``);
        lines.push(`> ${reason}`);
        if (failure.detail?.suggestions?.length) {
          lines.push("");
          lines.push("**Suggestions:**");
          for (const suggestion of failure.detail.suggestions) {
            lines.push(`- ${suggestion}`);
          }
        }
        lines.push("");
      }
    }
    lines.push("</details>");
    lines.push("");
  }
  if (showSuccesses && summary.passedComponents > 0) {
    const successfulFiles = results.filter(
      (r) => r.compilationResult.successfulCompilations.length > 0
    );
    lines.push("<details>");
    lines.push(`<summary>\u2705 Optimized Components (${summary.passedComponents})</summary>`);
    lines.push("");
    for (const file of successfulFiles) {
      for (const success of file.compilationResult.successfulCompilations) {
        const line = success.fnLoc?.start?.line ?? 0;
        const name = success.fnName ?? "anonymous";
        const fileLink = formatFileLink(file.filePath, line, repoUrl, commitSha);
        lines.push(`- ${fileLink} - \`${name}\``);
      }
    }
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }
  if (summary.failedComponents === 0 && summary.totalComponents > 0) {
    lines.push("\u{1F389} **All components are optimized by React Compiler!**");
  }
  lines.push("");
  lines.push("---");
  lines.push("*Generated by [React Compiler Healthcheck](https://github.com/anthropics/react-compiler-healthcheck)*");
  return lines.join("\n");
}
function formatFileLink(filePath, line, repoUrl, commitSha) {
  if (repoUrl && commitSha) {
    const url = `${repoUrl}/blob/${commitSha}/${filePath}#L${line}`;
    return `[\`${filePath}:${line}\`](${url})`;
  }
  return `\`${filePath}:${line}\``;
}

// src/reporters/annotations.ts
var core = __toESM(require("@actions/core"));
function createAnnotations(result) {
  const annotations = [];
  for (const file of result.results) {
    if (file.error) {
      annotations.push({
        path: file.filePath,
        startLine: 1,
        endLine: 1,
        level: "error",
        message: file.error,
        title: "React Compiler Error"
      });
      continue;
    }
    for (const failure of file.compilationResult.failedCompilations) {
      const startLine = failure.fnLoc?.start?.line ?? 1;
      const endLine = failure.fnLoc?.end?.line ?? startLine;
      const name = failure.fnName ?? "anonymous";
      const reason = failure.detail?.reason ?? failure.detail?.description ?? "Unknown reason";
      let message = `Component "${name}" was not optimized by React Compiler.

Reason: ${reason}`;
      if (failure.detail?.suggestions?.length) {
        message += "\n\nSuggestions:\n" + failure.detail.suggestions.map((s) => `\u2022 ${s}`).join("\n");
      }
      annotations.push({
        path: file.filePath,
        startLine,
        endLine,
        level: "warning",
        message,
        title: `React Compiler: ${name} not optimized`
      });
    }
  }
  return annotations;
}
function emitAnnotations(result) {
  const annotations = createAnnotations(result);
  for (const annotation of annotations) {
    const properties = {
      file: annotation.path,
      startLine: annotation.startLine,
      endLine: annotation.endLine,
      title: annotation.title
    };
    switch (annotation.level) {
      case "error":
        core.error(annotation.message, properties);
        break;
      case "warning":
        core.warning(annotation.message, properties);
        break;
      case "notice":
        core.notice(annotation.message, properties);
        break;
    }
  }
}

// src/index.ts
async function runHealthcheck(config = {}) {
  const {
    include = DEFAULT_INCLUDE_PATTERNS,
    exclude = DEFAULT_EXCLUDE_PATTERNS,
    cwd = process.cwd(),
    babelPluginPath = "node_modules/babel-plugin-react-compiler"
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
  const results = checkFiles(files, cwd, babelPluginPath);
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
    const { compilationResult, error: error2 } = result;
    if (error2) {
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
  const includeRaw = core2.getInput("include") || "**/*.jsx,**/*.tsx";
  const excludeRaw = core2.getInput("exclude") || "**/node_modules/**";
  return {
    include: includeRaw.split(",").map((s) => s.trim()).filter(Boolean),
    exclude: excludeRaw.split(",").map((s) => s.trim()).filter(Boolean),
    failOnError: core2.getInput("fail-on-error") !== "false",
    failThreshold: parseInt(core2.getInput("fail-threshold") || "0", 10),
    commentOnPr: core2.getInput("comment-on-pr") !== "false",
    annotations: core2.getInput("annotations") !== "false",
    workingDirectory: core2.getInput("working-directory") || ".",
    githubToken: core2.getInput("github-token")
  };
}
async function findExistingComment(octokit, owner, repo, prNumber) {
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber
  });
  const marker = "<!-- react-compiler-healthcheck -->";
  const existing = comments.data.find((c) => c.body?.includes(marker));
  return existing?.id ?? null;
}
async function postOrUpdateComment(octokit, owner, repo, prNumber, body) {
  const marker = "<!-- react-compiler-healthcheck -->";
  const fullBody = `${marker}
${body}`;
  const existingCommentId = await findExistingComment(octokit, owner, repo, prNumber);
  if (existingCommentId) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingCommentId,
      body: fullBody
    });
    core2.info(`Updated existing PR comment #${existingCommentId}`);
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: fullBody
    });
    core2.info("Created new PR comment");
  }
}
async function run() {
  try {
    const inputs = parseInputs();
    const cwd = path2.resolve(inputs.workingDirectory);
    core2.info(`Working directory: ${cwd}`);
    core2.info(`Include patterns: ${inputs.include.join(", ")}`);
    core2.info(`Exclude patterns: ${inputs.exclude.join(", ")}`);
    const result = await runHealthcheck({
      include: inputs.include,
      exclude: inputs.exclude,
      cwd
    });
    const { summary } = result;
    const passRate = summary.totalComponents > 0 ? summary.passedComponents / summary.totalComponents * 100 : 100;
    core2.setOutput("total-files", summary.totalFiles.toString());
    core2.setOutput("total-components", summary.totalComponents.toString());
    core2.setOutput("passed", summary.passedComponents.toString());
    core2.setOutput("failed", summary.failedComponents.toString());
    core2.setOutput("pass-rate", passRate.toFixed(1));
    console.log(formatConsoleReport(result));
    if (inputs.annotations) {
      emitAnnotations(result);
    }
    const context2 = github.context;
    const isPullRequest = !!context2.payload.pull_request;
    if (inputs.commentOnPr && isPullRequest && inputs.githubToken) {
      const octokit = github.getOctokit(inputs.githubToken);
      const prNumber = context2.payload.pull_request.number;
      const { owner, repo } = context2.repo;
      const repoUrl = `https://github.com/${owner}/${repo}`;
      const commitSha = context2.sha;
      const markdown = formatMarkdownReport(result, { repoUrl, commitSha });
      await postOrUpdateComment(octokit, owner, repo, prNumber, markdown);
    }
    let shouldFail = false;
    if (inputs.failOnError && summary.failedComponents > 0) {
      shouldFail = true;
    } else if (!inputs.failOnError && inputs.failThreshold > 0) {
      const failRate = 100 - passRate;
      if (failRate > inputs.failThreshold) {
        shouldFail = true;
      }
    }
    core2.setOutput("success", (!shouldFail).toString());
    if (shouldFail) {
      core2.setFailed(
        `React Compiler healthcheck failed: ${summary.failedComponents} component(s) not optimized`
      );
    }
  } catch (error2) {
    if (error2 instanceof Error) {
      core2.setFailed(error2.message);
    } else {
      core2.setFailed("An unexpected error occurred");
    }
  }
}
run();
