export type EventLocation = {
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
export type Detail = {
    kind?: string;
    loc?: EventLocation;
    message?: string;
};
export type Details = {
    reason?: string;
    description?: string;
    suggestions?: string[];
    loc?: EventLocation;
    details?: Array<Detail>;
};
export type LoggerEvent = {
    filename: string | null;
    kind?: string;
    fnLoc: EventLocation;
    fnName?: string;
    detail?: Details & {
        options: Details;
    };
};
export type CompilationResult = {
    successfulCompilations: Array<LoggerEvent>;
    failedCompilations: Array<LoggerEvent>;
};
export type FileCheckResult = {
    filePath: string;
    success: boolean;
    compilationResult: CompilationResult;
    error?: string;
};
export type HealthcheckSummary = {
    totalFiles: number;
    totalComponents: number;
    passedComponents: number;
    failedComponents: number;
    filesWithErrors: number;
    filesFullyOptimized: number;
};
export type HealthcheckResult = {
    summary: HealthcheckSummary;
    results: FileCheckResult[];
};
export type HealthcheckConfig = {
    include: string[];
    exclude: string[];
    cwd?: string;
};
//# sourceMappingURL=types.d.ts.map