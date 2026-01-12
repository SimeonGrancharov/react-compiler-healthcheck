import * as core from "@actions/core";
import type { HealthcheckResult, FileCheckResult, LoggerEvent } from "../core/types";

export type Annotation = {
  path: string;
  startLine: number;
  endLine: number;
  level: "error" | "warning" | "notice";
  message: string;
  title: string;
};

export function createAnnotations(result: HealthcheckResult): Annotation[] {
  const annotations: Annotation[] = [];

  for (const file of result.results) {
    if (file.error) {
      annotations.push({
        path: file.filePath,
        startLine: 1,
        endLine: 1,
        level: "error",
        message: file.error,
        title: "React Compiler Error",
      });
      continue;
    }

    for (const failure of file.compilationResult.failedCompilations) {
      const startLine = failure.fnLoc?.start?.line ?? 1;
      const endLine = failure.fnLoc?.end?.line ?? startLine;
      const name = failure.fnName ?? "anonymous";
      const reason = failure.detail?.reason ?? failure.detail?.description ?? "Unknown reason";

      let message = `Component "${name}" was not optimized by React Compiler.\n\nReason: ${reason}`;

      if (failure.detail?.suggestions?.length) {
        message += "\n\nSuggestions:\n" + failure.detail.suggestions.map(s => `• ${s}`).join("\n");
      }

      annotations.push({
        path: file.filePath,
        startLine,
        endLine,
        level: "warning",
        message,
        title: `React Compiler: ${name} not optimized`,
      });
    }
  }

  return annotations;
}

export function emitAnnotations(result: HealthcheckResult): void {
  const annotations = createAnnotations(result);

  for (const annotation of annotations) {
    const properties: core.AnnotationProperties = {
      file: annotation.path,
      startLine: annotation.startLine,
      endLine: annotation.endLine,
      title: annotation.title,
    };

    switch (annotation.level) {
      case "error":
        core.error(annotation.message, properties);
        break;
      case "warning":
        core.warning(annotation.message, properties);
        break;
      case "notice":
        core.notice(annotation.message, properties);
        break;
    }
  }
}
