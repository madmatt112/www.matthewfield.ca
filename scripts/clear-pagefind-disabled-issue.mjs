#!/usr/bin/env node
/**
 * clear-pagefind-disabled-issue — Req 1.4 v4 companion to
 * warn-no-pagefind.mjs.
 *
 * Closes any open issue labeled `pagefind-disabled`. Wired into the
 * `"Pagefind crawl (Build 2)"` step's post-success block so that a
 * successful Pagefind deploy automatically clears the persistent-
 * disabled-state alarm.
 *
 * Reads env vars:
 *   - GH_TOKEN : token for `gh` CLI auth (consumed by gh automatically).
 *
 * Dry-run: set CLEAR_PAGEFIND_DRY_RUN=1 to print the gh commands that
 * would be invoked (to stderr) without actually running them.
 *
 * Exit codes:
 *   0 — success (including the "no open issues found" case).
 *   1 — a required `gh` call failed.
 */

import { spawnSync } from "node:child_process";

const TAG = "[clear-pagefind-disabled-issue]";

const ISSUE_LABEL = "pagefind-disabled";
const CLOSE_COMMENT = "Pagefind has been re-enabled — closing this issue automatically.";

const DRY_RUN = process.env.CLEAR_PAGEFIND_DRY_RUN === "1";

/**
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

/** @param {string} s */
function quoteForLog(s) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

async function main() {
  const list = runGh(
    ["issue", "list", "--label", ISSUE_LABEL, "--state", "open", "--json", "number"],
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

  if (!Array.isArray(issues) || issues.length === 0) {
    console.log(`${TAG} no open pagefind-disabled issues to close.`);
    return 0;
  }

  let failures = 0;
  for (const issue of issues) {
    if (!issue || typeof issue.number !== "number") continue;
    const close = runGh(["issue", "close", String(issue.number), "--comment", CLOSE_COMMENT]);
    if (close.status !== 0) {
      console.error(
        `${TAG} gh issue close #${issue.number} failed (exit ${close.status})` +
          (close.stderr ? `\n${TAG} stderr: ${close.stderr.trim()}` : ""),
      );
      failures += 1;
      continue;
    }
    console.log(`${TAG} closed pagefind-disabled issue #${issue.number}.`);
  }

  return failures > 0 ? 1 : 0;
}

const code = await main();
process.exit(code);
