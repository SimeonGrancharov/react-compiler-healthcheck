import { PluginObj, transformFromAstSync } from "@babel/core";
import * as BabelParser from "@babel/parser";
import * as path from "path";
import * as fs from "fs";
import type { LoggerEvent, CompilationResult, FileCheckResult } from "./types";

const DEFAULT_COMPILER_OPTIONS = {
  noEmit: true,
  compilationMode: "infer" as const,
  panicThreshold: "none" as const,
  environment: {
    enableTreatRefLikeIdentifiersAsRefs: true,
  },
};

let cachedPlugin: PluginObj | undefined;

export function clearPluginCache(): void {
  cachedPlugin = undefined;
}

function loadBabelPlugin(
  workspaceFolder: string | undefined,
  babelPluginPath: string
): PluginObj | undefined {
  if (cachedPlugin) {
    return cachedPlugin;
  }

  if (workspaceFolder) {
    const fullPath = path.join(workspaceFolder, babelPluginPath);
    try {
      cachedPlugin = require(fullPath);
      return cachedPlugin;
    } catch (error: any) {
      console.warn(
        `Could not load babel-plugin-react-compiler from ${fullPath}: ${error?.message}`
      );
    }
  }

  try {
    cachedPlugin = require("babel-plugin-react-compiler");
    return cachedPlugin;
  } catch (error: any) {
    console.error(
      `Failed to load babel-plugin-react-compiler: ${error?.message}`
    );
    return undefined;
  }
}

// .js/.jsx/.mjs use Flow parser, everything else uses TypeScript
function getLanguageFromFilename(filename: string): "flow" | "typescript" {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ["js", "jsx", "mjs"].includes(ext ?? "") ? "flow" : "typescript";
}

function runBabelPluginReactCompiler(
  BabelPluginReactCompiler: PluginObj,
  sourceCode: string,
  filename: string,
  language: "flow" | "typescript"
): CompilationResult {
  const successfulCompilations: Array<LoggerEvent> = [];
  const failedCompilations: Array<LoggerEvent> = [];

  // Intercept logger events emitted by the React Compiler for each component
  const logger = {
    logEvent(filenameArg: string | null, rawEvent: LoggerEvent) {
      const event = { ...rawEvent, filename: filenameArg };
      switch (event.kind) {
        case "CompileSuccess": {
          successfulCompilations.push(event);
          return;
        }
        case "CompileError":
        case "CompileDiagnostic":
        case "PipelineError":
          failedCompilations.push(event);
          return;
      }
    },
  };

  const compilerOptions = {
    ...DEFAULT_COMPILER_OPTIONS,
    logger,
  };

  const ast = BabelParser.parse(sourceCode, {
    sourceFilename: filename,
    plugins: [language, "jsx"],
    sourceType: "module",
  });

  // Disable configFile and babelrc to avoid interference from user's Babel setup
  const result = transformFromAstSync(ast, sourceCode, {
    filename,
    highlightCode: false,
    retainLines: true,
    plugins: [[BabelPluginReactCompiler, compilerOptions]],
    sourceType: "module",
    configFile: false,
    babelrc: false,
  });

  if (result?.code == null) {
    throw new Error(
      `babel-plugin-react-compiler failed to generate code for ${filename}`
    );
  }

  return {
    successfulCompilations,
    failedCompilations,
  };
}

export function checkFile(
  filePath: string,
  workspaceFolder?: string,
  babelPluginPath: string = "node_modules/babel-plugin-react-compiler"
): FileCheckResult {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(workspaceFolder || process.cwd(), filePath);

  let sourceCode: string;
  try {
    sourceCode = fs.readFileSync(absolutePath, "utf-8");
  } catch (error: any) {
    return {
      filePath,
      success: false,
      compilationResult: {
        successfulCompilations: [],
        failedCompilations: [],
      },
      error: `Failed to read file: ${error?.message}`,
    };
  }

  const plugin = loadBabelPlugin(workspaceFolder, babelPluginPath);
  if (!plugin) {
    return {
      filePath,
      success: false,
      compilationResult: {
        successfulCompilations: [],
        failedCompilations: [],
      },
      error: "babel-plugin-react-compiler is not available",
    };
  }

  try {
    const language = getLanguageFromFilename(filePath);
    const compilationResult = runBabelPluginReactCompiler(
      plugin,
      sourceCode,
      absolutePath,
      language
    );

    const hasFailures = compilationResult.failedCompilations.length > 0;

    return {
      filePath,
      success: !hasFailures,
      compilationResult,
    };
  } catch (error: any) {
    return {
      filePath,
      success: false,
      compilationResult: {
        successfulCompilations: [],
        failedCompilations: [],
      },
      error: `Compilation error: ${error?.message}`,
    };
  }
}

export function checkFiles(
  filePaths: string[],
  workspaceFolder?: string,
  babelPluginPath?: string
): FileCheckResult[] {
  return filePaths.map((filePath) =>
    checkFile(filePath, workspaceFolder, babelPluginPath)
  );
}
