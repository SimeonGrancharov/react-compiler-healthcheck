import { glob } from "glob";
import * as path from "path";

export type ScanOptions = {
  include: string[];
  exclude?: string[];
  cwd?: string;
};

export const DEFAULT_INCLUDE_PATTERNS = ["**/*.jsx", "**/*.tsx"];

export const DEFAULT_EXCLUDE_PATTERNS = [
  "**/node_modules/**",
  "**/*.test.{js,jsx,ts,tsx}",
  "**/*.spec.{js,jsx,ts,tsx}",
  "**/__tests__/**",
  "**/__mocks__/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
];

export async function scanFiles(options: ScanOptions): Promise<string[]> {
  const {
    include,
    exclude = DEFAULT_EXCLUDE_PATTERNS,
    cwd = process.cwd(),
  } = options;

  const allFiles: Set<string> = new Set();

  for (const pattern of include) {
    const matches = await glob(pattern, {
      cwd,
      ignore: exclude,
      nodir: true,
      absolute: false,
    });

    for (const match of matches) {
      allFiles.add(match);
    }
  }

  return Array.from(allFiles).sort();
}

export function filterReactFiles(files: string[]): string[] {
  const reactExtensions = [".jsx", ".tsx"];
  return files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return reactExtensions.includes(ext);
  });
}

export async function matchesPatterns(
  filePath: string,
  patterns: string[],
  cwd?: string
): Promise<boolean> {
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: cwd || process.cwd(),
      nodir: true,
    });
    if (matches.includes(filePath)) {
      return true;
    }
  }
  return false;
}
