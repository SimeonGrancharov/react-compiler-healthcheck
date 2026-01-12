type EventLocation = {
    start?: {
        line?: number;
        column?: number;
        index?: number;
    };
    end?: {
        line?: number;
        column?: number;
        index?: number;
    };
};
type Detail = {
    kind?: string;
    loc?: EventLocation;
    message?: string;
};
type Details = {
    reason?: string;
    description?: string;
    suggestions?: string[];
    loc?: EventLocation;
    details?: Array<Detail>;
};
type LoggerEvent = {
    filename: string | null;
    kind?: string;
    fnLoc: EventLocation;
    fnName?: string;
    detail?: Details & {
        options: Details;
    };
};
type CompilationResult = {
    successfulCompilations: Array<LoggerEvent>;
    failedCompilations: Array<LoggerEvent>;
};
type FileCheckResult = {
    filePath: string;
    success: boolean;
    compilationResult: CompilationResult;
    error?: string;
};
type HealthcheckSummary = {
    totalFiles: number;
    totalComponents: number;
    passedComponents: number;
    failedComponents: number;
    filesWithErrors: number;
    filesFullyOptimized: number;
};
type HealthcheckResult = {
    summary: HealthcheckSummary;
    results: FileCheckResult[];
};
type HealthcheckConfig = {
    include: string[];
    exclude: string[];
    cwd?: string;
};

declare function clearPluginCache(): void;
declare function checkFile(filePath: string, workspaceFolder?: string): FileCheckResult;
declare function checkFiles(filePaths: string[], workspaceFolder?: string): FileCheckResult[];

type ScanOptions = {
    include: string[];
    exclude?: string[];
    cwd?: string;
};
declare const DEFAULT_INCLUDE_PATTERNS: string[];
declare const DEFAULT_EXCLUDE_PATTERNS: string[];
declare function scanFiles(options: ScanOptions): Promise<string[]>;

declare function formatConsoleReport(result: HealthcheckResult): string;
declare function printConsoleReport(result: HealthcheckResult): void;

type MarkdownReportOptions = {
    repoUrl?: string;
    commitSha?: string;
    showSuccesses?: boolean;
};
declare function formatMarkdownReport(result: HealthcheckResult, options?: MarkdownReportOptions): string;

type Annotation = {
    path: string;
    startLine: number;
    endLine: number;
    level: "error" | "warning" | "notice";
    message: string;
    title: string;
};
declare function createAnnotations(result: HealthcheckResult): Annotation[];
declare function emitAnnotations(result: HealthcheckResult): void;

declare function runHealthcheck(config?: Partial<HealthcheckConfig>): Promise<HealthcheckResult>;

export { type Annotation, type CompilationResult, DEFAULT_EXCLUDE_PATTERNS, DEFAULT_INCLUDE_PATTERNS, type FileCheckResult, type HealthcheckConfig, type HealthcheckResult, type HealthcheckSummary, type LoggerEvent, type MarkdownReportOptions, checkFile, checkFiles, clearPluginCache, createAnnotations, emitAnnotations, formatConsoleReport, formatMarkdownReport, printConsoleReport, runHealthcheck, scanFiles };
