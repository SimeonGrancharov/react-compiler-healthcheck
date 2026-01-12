import type { HealthcheckResult, FileCheckResult } from "../core/types";

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

function colorize(text: string, color: keyof typeof COLORS): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

export function formatConsoleReport(result: HealthcheckResult): string {
  const lines: string[] = [];
  const { summary, results } = result;

  lines.push("");
  lines.push(colorize("React Compiler Healthcheck Results", "bold"));
  lines.push("═".repeat(50));
  lines.push("");

  const passRate = summary.totalComponents > 0
    ? ((summary.passedComponents / summary.totalComponents) * 100).toFixed(1)
    : "0.0";

  lines.push(`${colorize("Files scanned:", "blue")} ${summary.totalFiles}`);
  lines.push(`${colorize("Total components:", "blue")} ${summary.totalComponents}`);
  lines.push(`${colorize("Passed:", "green")} ${summary.passedComponents}`);
  lines.push(`${colorize("Failed:", "red")} ${summary.failedComponents}`);
  lines.push(`${colorize("Pass rate:", "blue")} ${passRate}%`);
  lines.push("");

  const failedFiles = results.filter(r => !r.success || r.error);

  if (failedFiles.length > 0) {
    lines.push(colorize("Failed Components:", "red"));
    lines.push("─".repeat(50));

    for (const file of failedFiles) {
      if (file.error) {
        lines.push(`  ${colorize("✗", "red")} ${file.filePath}`);
        lines.push(`    ${colorize(file.error, "gray")}`);
        continue;
      }

      for (const failure of file.compilationResult.failedCompilations) {
        const line = failure.fnLoc?.start?.line ?? "?";
        const name = failure.fnName ?? "anonymous";
        const reason = failure.detail?.reason ?? failure.detail?.description ?? "Unknown reason";

        lines.push(`  ${colorize("✗", "red")} ${file.filePath}:${line} - ${colorize(name, "yellow")}`);
        lines.push(`    ${colorize(reason, "gray")}`);

        if (failure.detail?.suggestions?.length) {
          for (const suggestion of failure.detail.suggestions) {
            lines.push(`    ${colorize("→", "blue")} ${suggestion}`);
          }
        }
      }
    }
    lines.push("");
  }

  if (summary.failedComponents === 0 && summary.totalComponents > 0) {
    lines.push(colorize("✓ All components are optimized by React Compiler!", "green"));
  } else if (summary.failedComponents > 0) {
    lines.push(colorize(`✗ ${summary.failedComponents} component(s) failed optimization`, "red"));
  }

  lines.push("");
  return lines.join("\n");
}

export function printConsoleReport(result: HealthcheckResult): void {
  console.log(formatConsoleReport(result));
}
