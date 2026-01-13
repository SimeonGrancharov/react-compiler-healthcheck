import { describe, it, expect } from "vitest";
import { formatConsoleReport } from "../reporters/console";
import type { HealthcheckResult } from "../core/types";

const mockSuccessResult: HealthcheckResult = {
  summary: {
    totalFiles: 2,
    totalComponents: 3,
    passedComponents: 3,
    failedComponents: 0,
    filesWithErrors: 0,
    filesFullyOptimized: 2,
  },
  results: [
    {
      filePath: "src/Button.tsx",
      success: true,
      compilationResult: {
        successfulCompilations: [
          { filename: "src/Button.tsx", fnName: "Button", fnLoc: { start: { line: 5 } } },
        ],
        failedCompilations: [],
      },
    },
    {
      filePath: "src/Card.tsx",
      success: true,
      compilationResult: {
        successfulCompilations: [
          { filename: "src/Card.tsx", fnName: "Card", fnLoc: { start: { line: 3 } } },
          { filename: "src/Card.tsx", fnName: "CardHeader", fnLoc: { start: { line: 15 } } },
        ],
        failedCompilations: [],
      },
    },
  ],
};

const mockFailureResult: HealthcheckResult = {
  summary: {
    totalFiles: 2,
    totalComponents: 3,
    passedComponents: 1,
    failedComponents: 2,
    filesWithErrors: 1,
    filesFullyOptimized: 1,
  },
  results: [
    {
      filePath: "src/Good.tsx",
      success: true,
      compilationResult: {
        successfulCompilations: [
          { filename: "src/Good.tsx", fnName: "Good", fnLoc: { start: { line: 1 } } },
        ],
        failedCompilations: [],
      },
    },
    {
      filePath: "src/Bad.tsx",
      success: false,
      compilationResult: {
        successfulCompilations: [],
        failedCompilations: [
          {
            filename: "src/Bad.tsx",
            fnName: "BadComponent",
            fnLoc: { start: { line: 10 }, end: { line: 20 } },
            kind: "CompileError",
            detail: {
              reason: "Mutating a ref during render",
              suggestions: ["Move mutation to useEffect"],
              options: { reason: "" },
            },
          },
          {
            filename: "src/Bad.tsx",
            fnName: "AnotherBad",
            fnLoc: { start: { line: 25 } },
            kind: "CompileError",
            detail: {
              reason: "Invalid hook call",
              options: { reason: "" },
            },
          },
        ],
      },
    },
  ],
};

describe("console reporter", () => {
  it("should format successful results", () => {
    const output = formatConsoleReport(mockSuccessResult);

    expect(output).toContain("React Compiler Healthcheck Results");
    expect(output).toContain("Files scanned:");
    expect(output).toContain("2");
    expect(output).toContain("Total components:");
    expect(output).toContain("3");
    expect(output).toContain("Pass rate:");
    expect(output).toContain("100.0%");
    expect(output).toContain("All components are optimized");
  });

  it("should format failed results with details", () => {
    const output = formatConsoleReport(mockFailureResult);

    expect(output).toContain("Failed Components:");
    expect(output).toContain("BadComponent");
    expect(output).toContain("Mutating a ref during render");
    expect(output).toContain("Move mutation to useEffect");
    expect(output).toContain("src/Bad.tsx:10");
  });

  it("should show pass rate", () => {
    const output = formatConsoleReport(mockFailureResult);
    expect(output).toContain("33.3%");
  });
});
