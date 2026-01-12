import * as core from "@actions/core";
import * as github from "@actions/github";
import * as path from "path";
import { runHealthcheck } from "./index";
import { formatConsoleReport } from "./reporters/console";
import { formatMarkdownReport } from "./reporters/markdown";
import { emitAnnotations } from "./reporters/annotations";

type ActionInputs = {
  include: string[];
  exclude: string[];
  failOnError: boolean;
  failThreshold: number;
  commentOnPr: boolean;
  annotations: boolean;
  workingDirectory: string;
  githubToken: string;
};

function parseInputs(): ActionInputs {
  const includeRaw = core.getInput("include") || "**/*.jsx,**/*.tsx";
  const excludeRaw = core.getInput("exclude") || "**/node_modules/**";

  return {
    include: includeRaw.split(",").map(s => s.trim()).filter(Boolean),
    exclude: excludeRaw.split(",").map(s => s.trim()).filter(Boolean),
    failOnError: core.getInput("fail-on-error") !== "false",
    failThreshold: parseInt(core.getInput("fail-threshold") || "0", 10),
    commentOnPr: core.getInput("comment-on-pr") !== "false",
    annotations: core.getInput("annotations") !== "false",
    workingDirectory: core.getInput("working-directory") || ".",
    githubToken: core.getInput("github-token"),
  };
}

async function findExistingComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number
): Promise<number | null> {
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
  });

  const marker = "<!-- react-compiler-healthcheck -->";
  const existing = comments.data.find(c => c.body?.includes(marker));
  return existing?.id ?? null;
}

async function postOrUpdateComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<void> {
  const marker = "<!-- react-compiler-healthcheck -->";
  const fullBody = `${marker}\n${body}`;

  const existingCommentId = await findExistingComment(octokit, owner, repo, prNumber);

  if (existingCommentId) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingCommentId,
      body: fullBody,
    });
    core.info(`Updated existing PR comment #${existingCommentId}`);
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: fullBody,
    });
    core.info("Created new PR comment");
  }
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

    if (inputs.annotations) {
      emitAnnotations(result);
    }

    const context = github.context;
    const isPullRequest = !!context.payload.pull_request;

    if (inputs.commentOnPr && isPullRequest && inputs.githubToken) {
      const octokit = github.getOctokit(inputs.githubToken);
      const prNumber = context.payload.pull_request!.number;
      const { owner, repo } = context.repo;

      const repoUrl = `https://github.com/${owner}/${repo}`;
      const commitSha = context.sha;

      const markdown = formatMarkdownReport(result, { repoUrl, commitSha });
      await postOrUpdateComment(octokit, owner, repo, prNumber, markdown);
    }

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
