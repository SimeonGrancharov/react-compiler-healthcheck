export type ScanOptions = {
    include: string[];
    exclude?: string[];
    cwd?: string;
};
export declare const DEFAULT_INCLUDE_PATTERNS: string[];
export declare const DEFAULT_EXCLUDE_PATTERNS: string[];
export declare function scanFiles(options: ScanOptions): Promise<string[]>;
export declare function filterReactFiles(files: string[]): string[];
export declare function matchesPatterns(filePath: string, patterns: string[], cwd?: string): Promise<boolean>;
//# sourceMappingURL=scanner.d.ts.map