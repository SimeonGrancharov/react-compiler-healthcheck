import { describe, it, expect } from "vitest";
import { formatConsoleReport } from "../reporters/console";
import { formatMarkdownReport } from "../reporters/markdown";
import { createAnnotations } from "../reporters/annotations";
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

describe("markdown reporter", () => {
  it("should format successful results with checkmark", () => {
    const output = formatMarkdownReport(mockSuccessResult);

    expect(output).toContain("## ✅ React Compiler Healthcheck");
    expect(output).toContain("| Pass rate | 100.0% |");
    expect(output).toContain("All components are optimized");
  });

  it("should format failed results with x mark", () => {
    const output = formatMarkdownReport(mockFailureResult);

    expect(output).toContain("## ❌ React Compiler Healthcheck");
    expect(output).toContain("Failed Components (2)");
    expect(output).toContain("BadComponent");
    expect(output).toContain("Mutating a ref during render");
  });

  it("should include suggestions when available", () => {
    const output = formatMarkdownReport(mockFailureResult);
    expect(output).toContain("Move mutation to useEffect");
  });

  it("should create file links when repo info provided", () => {
    const output = formatMarkdownReport(mockFailureResult, {
      repoUrl: "https://github.com/test/repo",
      commitSha: "abc123",
    });

    expect(output).toContain("https://github.com/test/repo/blob/abc123/src/Bad.tsx#L10");
  });

  it("should use collapsible sections", () => {
    const output = formatMarkdownReport(mockFailureResult);
    expect(output).toContain("<details>");
    expect(output).toContain("<summary>");
    expect(output).toContain("</details>");
  });
});

describe("annotations reporter", () => {
  it("should create annotations for failed components", () => {
    const annotations = createAnnotations(mockFailureResult);

    expect(annotations.length).toBe(2);
    expect(annotations[0].path).toBe("src/Bad.tsx");
    expect(annotations[0].startLine).toBe(10);
    expect(annotations[0].endLine).toBe(20);
    expect(annotations[0].level).toBe("warning");
    expect(annotations[0].message).toContain("BadComponent");
    expect(annotations[0].message).toContain("Mutating a ref during render");
  });

  it("should include suggestions in annotation message", () => {
    const annotations = createAnnotations(mockFailureResult);
    expect(annotations[0].message).toContain("Move mutation to useEffect");
  });

  it("should return empty array for successful results", () => {
    const annotations = createAnnotations(mockSuccessResult);
    expect(annotations).toEqual([]);
  });

  it("should handle file-level errors", () => {
    const resultWithError: HealthcheckResult = {
      summary: {
        totalFiles: 1,
        totalComponents: 0,
        passedComponents: 0,
        failedComponents: 0,
        filesWithErrors: 1,
        filesFullyOptimized: 0,
      },
      results: [
        {
          filePath: "src/Broken.tsx",
          success: false,
          compilationResult: { successfulCompilations: [], failedCompilations: [] },
          error: "Syntax error on line 5",
        },
      ],
    };

    const annotations = createAnnotations(resultWithError);
    expect(annotations.length).toBe(1);
    expect(annotations[0].level).toBe("error");
    expect(annotations[0].message).toContain("Syntax error");
  });
});
