import { describe, it, expect, beforeEach } from "vitest";
import * as path from "path";
import { checkFile, checkFiles, clearPluginCache } from "../core/compiler";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

describe("compiler", () => {
  beforeEach(() => {
    clearPluginCache();
  });

  describe("checkFile", () => {
    it("should detect fully optimized components", () => {
      const result = checkFile(
        path.join(FIXTURES_DIR, "OptimizedComponent.tsx")
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.compilationResult.successfulCompilations.length).toBeGreaterThan(0);
      expect(result.compilationResult.failedCompilations.length).toBe(0);
    });

    it("should detect unoptimized components", () => {
      const result = checkFile(
        path.join(FIXTURES_DIR, "UnoptimizedComponent.tsx")
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeUndefined();
      expect(result.compilationResult.failedCompilations.length).toBeGreaterThan(0);
    });

    it("should handle mixed files with both passing and failing components", () => {
      const result = checkFile(
        path.join(FIXTURES_DIR, "MixedComponent.tsx")
      );

      expect(result.success).toBe(false);
      expect(result.compilationResult.successfulCompilations.length).toBeGreaterThan(0);
      expect(result.compilationResult.failedCompilations.length).toBeGreaterThan(0);
    });

    it("should return error for non-existent file", () => {
      const result = checkFile(
        path.join(FIXTURES_DIR, "NonExistent.tsx")
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to read file");
    });

    it("should include function names in compilation results", () => {
      const result = checkFile(
        path.join(FIXTURES_DIR, "OptimizedComponent.tsx")
      );

      const fnNames = result.compilationResult.successfulCompilations.map(c => c.fnName);
      expect(fnNames).toContain("OptimizedComponent");
      expect(fnNames).toContain("AnotherOptimized");
    });

    it("should include location info in compilation results", () => {
      const result = checkFile(
        path.join(FIXTURES_DIR, "OptimizedComponent.tsx")
      );

      for (const compilation of result.compilationResult.successfulCompilations) {
        expect(compilation.fnLoc).toBeDefined();
        expect(compilation.fnLoc.start?.line).toBeGreaterThan(0);
      }
    });
  });

  describe("checkFiles", () => {
    it("should check multiple files", () => {
      const results = checkFiles([
        path.join(FIXTURES_DIR, "OptimizedComponent.tsx"),
        path.join(FIXTURES_DIR, "UnoptimizedComponent.tsx"),
      ]);

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it("should handle empty file list", () => {
      const results = checkFiles([]);
      expect(results).toEqual([]);
    });
  });
});
