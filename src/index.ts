import {
  scanFiles,
  DEFAULT_INCLUDE_PATTERNS,
  DEFAULT_EXCLUDE_PATTERNS,
} from "./core/scanner";
import { checkFiles } from "./core/compiler";
import type {
  HealthcheckConfig,
  HealthcheckResult,
  HealthcheckSummary,
  FileCheckResult,
  CompilationResult,
  LoggerEvent,
} from "./core/types";

export type {
  HealthcheckConfig,
  HealthcheckResult,
  HealthcheckSummary,
  FileCheckResult,
  CompilationResult,
  LoggerEvent,
} from "./core/types";
export { checkFile, checkFiles, clearPluginCache } from "./core/compiler";
export { scanFiles, DEFAULT_INCLUDE_PATTERNS, DEFAULT_EXCLUDE_PATTERNS } from "./core/scanner";

export { formatConsoleReport, printConsoleReport } from "./reporters/console";

export async function runHealthcheck(
  config: Partial<HealthcheckConfig> = {}
): Promise<HealthcheckResult> {
  const {
    include = DEFAULT_INCLUDE_PATTERNS,
    exclude = DEFAULT_EXCLUDE_PATTERNS,
    cwd = process.cwd(),
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
        filesFullyOptimized: 0,
      },
      results: [],
    };
  }

  console.log("Checking files for React Compiler optimization...");
  const results = checkFiles(files, cwd);
  const summary = calculateSummary(results);

  return {
    summary,
    results,
  };
}

function calculateSummary(results: FileCheckResult[]): HealthcheckSummary {
  let totalComponents = 0;
  let passedComponents = 0;
  let failedComponents = 0;
  let filesWithErrors = 0;
  let filesFullyOptimized = 0;

  for (const result of results) {
    const { compilationResult, error, filePath } = result;

    if (error) {
      filesWithErrors++;
      continue;
    }

    const passed = compilationResult.successfulCompilations.length;

    // Deduplicate failed components by location and name
    // (same component can have multiple violations)
    const uniqueFailedComponents = new Set<string>();
    for (const failure of compilationResult.failedCompilations) {
      const line = failure.fnLoc?.start?.line ?? "?";
      const name = failure.fnName ?? "anonymous";
      uniqueFailedComponents.add(`${filePath}|${line}|${name}`);
    }
    const failed = uniqueFailedComponents.size;

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
    filesFullyOptimized,
  };
}
