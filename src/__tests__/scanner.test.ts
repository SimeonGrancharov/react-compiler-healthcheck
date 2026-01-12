import { describe, it, expect } from "vitest";
import * as path from "path";
import {
  scanFiles,
  filterReactFiles,
  DEFAULT_INCLUDE_PATTERNS,
  DEFAULT_EXCLUDE_PATTERNS,
} from "../core/scanner";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

describe("scanner", () => {
  describe("scanFiles", () => {
    it("should find tsx files in fixtures directory", async () => {
      const files = await scanFiles({
        include: ["**/*.tsx"],
        cwd: FIXTURES_DIR,
      });

      expect(files.length).toBe(3);
      expect(files).toContain("MixedComponent.tsx");
      expect(files).toContain("OptimizedComponent.tsx");
      expect(files).toContain("UnoptimizedComponent.tsx");
    });

    it("should respect exclude patterns", async () => {
      const files = await scanFiles({
        include: ["**/*.tsx"],
        exclude: ["**/Mixed*"],
        cwd: FIXTURES_DIR,
      });

      expect(files.length).toBe(2);
      expect(files).not.toContain("MixedComponent.tsx");
    });

    it("should return empty array when no files match", async () => {
      const files = await scanFiles({
        include: ["**/*.vue"],
        cwd: FIXTURES_DIR,
      });

      expect(files).toEqual([]);
    });

    it("should return sorted file list", async () => {
      const files = await scanFiles({
        include: ["**/*.tsx"],
        cwd: FIXTURES_DIR,
      });

      const sorted = [...files].sort();
      expect(files).toEqual(sorted);
    });

    it("should handle multiple include patterns", async () => {
      const files = await scanFiles({
        include: ["**/Optimized*.tsx", "**/Unoptimized*.tsx"],
        cwd: FIXTURES_DIR,
      });

      expect(files.length).toBe(2);
      expect(files).toContain("OptimizedComponent.tsx");
      expect(files).toContain("UnoptimizedComponent.tsx");
    });
  });

  describe("filterReactFiles", () => {
    it("should filter to only jsx and tsx files", () => {
      const input = [
        "Component.tsx",
        "utils.ts",
        "Button.jsx",
        "helper.js",
        "styles.css",
      ];

      const result = filterReactFiles(input);

      expect(result).toEqual(["Component.tsx", "Button.jsx"]);
    });

    it("should handle empty array", () => {
      expect(filterReactFiles([])).toEqual([]);
    });

    it("should be case insensitive for extensions", () => {
      const input = ["Component.TSX", "Button.JSX"];
      const result = filterReactFiles(input);

      expect(result).toEqual(["Component.TSX", "Button.JSX"]);
    });
  });

  describe("default patterns", () => {
    it("should have sensible default include patterns", () => {
      expect(DEFAULT_INCLUDE_PATTERNS).toContain("**/*.jsx");
      expect(DEFAULT_INCLUDE_PATTERNS).toContain("**/*.tsx");
    });

    it("should exclude common non-source directories by default", () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/node_modules/**");
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/dist/**");
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/build/**");
    });

    it("should exclude test files by default", () => {
      const hasTestExclude = DEFAULT_EXCLUDE_PATTERNS.some(
        p => p.includes(".test.") || p.includes(".spec.") || p.includes("__tests__")
      );
      expect(hasTestExclude).toBe(true);
    });
  });
});
