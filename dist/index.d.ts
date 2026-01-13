import type { HealthcheckConfig, HealthcheckResult } from "./core/types";
export type { HealthcheckConfig, HealthcheckResult, HealthcheckSummary, FileCheckResult, CompilationResult, LoggerEvent, } from "./core/types";
export { checkFile, checkFiles, clearPluginCache } from "./core/compiler";
export { scanFiles, DEFAULT_INCLUDE_PATTERNS, DEFAULT_EXCLUDE_PATTERNS } from "./core/scanner";
export { formatConsoleReport, printConsoleReport } from "./reporters/console";
export declare function runHealthcheck(config?: Partial<HealthcheckConfig>): Promise<HealthcheckResult>;
//# sourceMappingURL=index.d.ts.map