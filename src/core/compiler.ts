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

type CachedPlugin = {
  plugin: PluginObj;
  version: string;
  source: string;
};

let cachedPlugin: CachedPlugin | undefined;
let pluginLoadFailed = false;

export function clearPluginCache(): void {
  cachedPlugin = undefined;
  pluginLoadFailed = false;
}

function getPluginVersion(pluginPath: string): string {
  // Walk up directories to find package.json (handles pnpm nested structure)
  let dir = path.dirname(pluginPath);
  for (let i = 0; i < 5; i++) {
    try {
      const packageJsonPath = path.join(dir, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      if (packageJson.name === "babel-plugin-react-compiler") {
        return packageJson.version || "unknown";
      }
    } catch {
      // Continue searching
    }
    dir = path.dirname(dir);
  }
  return "unknown";
}

function loadBabelPlugin(
  workspaceFolder: string | undefined,
): PluginObj | undefined {
  if (cachedPlugin) {
    return cachedPlugin.plugin;
  }

  if (pluginLoadFailed) {
    return undefined;
  }

  const searchPath = workspaceFolder || process.cwd();

  // Use Node's resolution algorithm which walks up directory tree
  // This handles monorepos where packages are hoisted to root node_modules
  try {
    const resolvedPath = require.resolve("babel-plugin-react-compiler", {
      paths: [searchPath],
    });
    const plugin = require(resolvedPath);
    const version = getPluginVersion(resolvedPath);
    cachedPlugin = { plugin, version, source: resolvedPath };
    console.log(`Using babel-plugin-react-compiler@${version} from ${resolvedPath}`);
    return plugin;
  } catch (error: any) {
    pluginLoadFailed = true;
    console.error(
      `\n❌ babel-plugin-react-compiler not found.\n` +
      `   Searched from: ${searchPath}\n\n` +
      `   Please install it in your project:\n` +
      `     npm install babel-plugin-react-compiler\n` +
      `   or\n` +
      `     pnpm add babel-plugin-react-compiler\n`
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

  const plugin = loadBabelPlugin(workspaceFolder);
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
): FileCheckResult[] {
  return filePaths.map((filePath) =>
    checkFile(filePath, workspaceFolder)
  );
}
