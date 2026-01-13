import * as core from "@actions/core";
import * as path from "path";
import { runHealthcheck } from "./index";
import { formatConsoleReport } from "./reporters/console";

type ActionInputs = {
  include: string[];
  exclude: string[];
  failOnError: boolean;
  failThreshold: number;
  workingDirectory: string;
};

function parseInputs(): ActionInputs {
  const includeRaw = core.getInput("include") || "**/*.jsx,**/*.tsx";
  const excludeRaw = core.getInput("exclude") || "**/node_modules/**";

  return {
    include: includeRaw.split(",").map(s => s.trim()).filter(Boolean),
    exclude: excludeRaw.split(",").map(s => s.trim()).filter(Boolean),
    failOnError: core.getInput("fail-on-error") !== "false",
    failThreshold: parseInt(core.getInput("fail-threshold") || "0", 10),
    workingDirectory: core.getInput("working-directory") || ".",
  };
}

async function run(): Promise<void> {
  try {
    const inputs = parseInputs();
    const cwd = path.resolve(inputs.workingDirectory);

    core.info(`Working directory: ${cwd}`);
    core.info(`Include patterns: ${inputs.include.join(", ")}`);
    core.info(`Exclude patterns: ${inputs.exclude.join(", ")}`);

    const result = await runHealthcheck({
      include: inputs.include,
      exclude: inputs.exclude,
      cwd,
    });

    const { summary } = result;
    const passRate = summary.totalComponents > 0
      ? (summary.passedComponents / summary.totalComponents) * 100
      : 100;

    core.setOutput("total-files", summary.totalFiles.toString());
    core.setOutput("total-components", summary.totalComponents.toString());
    core.setOutput("passed", summary.passedComponents.toString());
    core.setOutput("failed", summary.failedComponents.toString());
    core.setOutput("pass-rate", passRate.toFixed(1));

    console.log(formatConsoleReport(result));

    let shouldFail = false;

    if (inputs.failOnError && summary.failedComponents > 0) {
      shouldFail = true;
    } else if (!inputs.failOnError && inputs.failThreshold > 0) {
      const failRate = 100 - passRate;
      if (failRate > inputs.failThreshold) {
        shouldFail = true;
      }
    }

    core.setOutput("success", (!shouldFail).toString());

    if (shouldFail) {
      core.setFailed(
        `React Compiler healthcheck failed: ${summary.failedComponents} component(s) not optimized`
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred");
    }
  }
}

run();
