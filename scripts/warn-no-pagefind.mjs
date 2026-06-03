#!/usr/bin/env node
/**
 * warn-no-pagefind — Req 1.4 v4 + Req 12.1 v4 kill-switch warning.
 *
 * Runs after a successful Vercel deploy when PAGEFIND_ENABLED=false, to
 * loudly surface the silent-persistent failure mode (r3 Top Risk #1).
 *
 * Reads env vars:
 *   - EVENT_NAME : "pull_request" | "push" | other (required)
 *   - PR_NUMBER  : pull request number (required if EVENT_NAME=pull_request)
 *   - REF        : "refs/heads/main" or similar (required if EVENT_NAME=push)
 *   - DEPLOY_URL : the deploy URL just produced (optional context)
 *   - GH_TOKEN   : token for `gh` CLI auth (consumed by gh automatically)
 *
 * Behavior:
 *   1. Always prints `::warning::<message>` to stdout (GitHub Actions
 *      annotation).
 *   2. If EVENT_NAME == "pull_request": posts the same message as a PR
 *      comment via `gh pr comment ${PR_NUMBER} --body ...`.
 *   3. If EVENT_NAME == "push" && REF == "refs/heads/main": ensures an
 *      open issue exists with label `pagefind-disabled` and title
 *      `[blog-enhanced] Pagefind currently disabled in production`.
 *      Creates if absent; updates body if present.
 *   4. Other event/ref combinations: warning-only, exit 0.
 *
 * Dry-run: set WARN_PAGEFIND_DRY_RUN=1 to print the gh commands that
 * would be invoked (to stderr) without actually running them.
 *
 * Exit codes:
 *   0 — success (or warning-only path).
 *   1 — a required `gh` call failed.
 *   2 — missing env vars for the branch taken.
 */

import { spawnSync } from "node:child_process";

const TAG = "[warn-no-pagefind]";

const WARNING_MESSAGE =
  "Deploy completed WITHOUT Pagefind index — site search will show " +
  "'unavailable' state. PAGEFIND_ENABLED variable is currently 'false'. " +
  "To restore search, set PAGEFIND_ENABLED=true (or unset) in repo " +
  "Settings → Variables.";

const ISSUE_TITLE = "[blog-enhanced] Pagefind currently disabled in production";
const ISSUE_LABEL = "pagefind-disabled";

const DRY_RUN = process.env.WARN_PAGEFIND_DRY_RUN === "1";

/**
 * Run a gh command. In dry-run mode, prints the command to stderr and
 * returns a synthetic success result (with optional stub stdout).
 *
 * @param {string[]} args
 * @param {{ stubStdout?: string }} [opts]
 * @returns {{ status: number | null, stdout: string, stderr: string }}
 */
function runGh(args, { stubStdout = "" } = {}) {
  if (DRY_RUN) {
    console.error(`${TAG} [dry-run] gh ${args.map(quoteForLog).join(" ")}`);
    return { status: 0, stdout: stubStdout, stderr: "" };
  }
  const res = spawnSync("gh", args, { encoding: "utf8" });
  return {
    status: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

/**
 * Best-effort shell-safe rendering for diagnostic logging only — NOT used
 * for invocation (spawnSync handles arg quoting natively).
 *
 * @param {string} s
 */
function quoteForLog(s) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/**
 * Build the issue body: warning copy + last-updated timestamp + deploy URL.
 *
 * @param {string | undefined} deployUrl
 */
function buildIssueBody(deployUrl) {
  const lines = [WARNING_MESSAGE, "", `_Last updated: ${new Date().toISOString()}_`];
  if (deployUrl) {
    lines.push(`_Most recent deploy: ${deployUrl}_`);
  }
  return lines.join("\n");
}

async function main() {
  const { EVENT_NAME, PR_NUMBER, REF, DEPLOY_URL } = process.env;

  // Step 1 — always emit the GitHub Actions annotation.
  console.log(`::warning::${WARNING_MESSAGE}`);

  if (!EVENT_NAME) {
    console.error(`${TAG} EVENT_NAME not set; emitted annotation only and exiting 0.`);
    return 0;
  }

  // Step 2 — branch on EVENT_NAME.
  if (EVENT_NAME === "pull_request") {
    if (!PR_NUMBER) {
      console.error(`${TAG} EVENT_NAME=pull_request but PR_NUMBER is not set.`);
      return 2;
    }
    const res = runGh(["pr", "comment", PR_NUMBER, "--body", WARNING_MESSAGE]);
    if (res.status !== 0) {
      console.error(
        `${TAG} gh pr comment failed (exit ${res.status})` +
          (res.stderr ? `\n${TAG} stderr: ${res.stderr.trim()}` : ""),
      );
      return 1;
    }
    console.log(`${TAG} posted warning comment on PR #${PR_NUMBER}.`);
    return 0;
  }

  if (EVENT_NAME === "push" && REF === "refs/heads/main") {
    // Look up existing issue by label.
    const list = runGh(
      ["issue", "list", "--label", ISSUE_LABEL, "--state", "open", "--json", "number,title,body"],
      { stubStdout: "[]" },
    );
    if (list.status !== 0) {
      console.error(
        `${TAG} gh issue list failed (exit ${list.status})` +
          (list.stderr ? `\n${TAG} stderr: ${list.stderr.trim()}` : ""),
      );
      return 1;
    }

    let issues;
    try {
      issues = JSON.parse(list.stdout || "[]");
    } catch (err) {
      console.error(`${TAG} failed to parse gh issue list JSON: ${err.message}`);
      return 1;
    }

    const body = buildIssueBody(DEPLOY_URL);
    const existing = Array.isArray(issues)
      ? issues.find((i) => i && i.title === ISSUE_TITLE)
      : undefined;

    if (existing && typeof existing.number === "number") {
      const edit = runGh(["issue", "edit", String(existing.number), "--body", body]);
      if (edit.status !== 0) {
        console.error(
          `${TAG} gh issue edit #${existing.number} failed (exit ${edit.status})` +
            (edit.stderr ? `\n${TAG} stderr: ${edit.stderr.trim()}` : ""),
        );
        return 1;
      }
      console.log(`${TAG} updated existing issue #${existing.number}.`);
      return 0;
    }

    const create = runGh([
      "issue",
      "create",
      "--title",
      ISSUE_TITLE,
      "--label",
      ISSUE_LABEL,
      "--body",
      body,
    ]);
    if (create.status !== 0) {
      console.error(
        `${TAG} gh issue create failed (exit ${create.status})` +
          (create.stderr ? `\n${TAG} stderr: ${create.stderr.trim()}` : ""),
      );
      return 1;
    }
    console.log(`${TAG} opened new pagefind-disabled issue.`);
    return 0;
  }

  // Other event/ref combinations: annotation-only.
  console.error(
    `${TAG} EVENT_NAME=${EVENT_NAME} REF=${REF ?? "(unset)"} — ` +
      `annotation-only path, no PR comment / issue action.`,
  );
  return 0;
}

const code = await main();
process.exit(code);
