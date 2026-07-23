#!/usr/bin/env node
// OpenSpec archive gate.
//
// Fails when an active change is fully complete (every task in its tasks.md is
// checked) but still lives in openspec/changes/ instead of being archived into
// openspec/changes/archive/. Intermediate PRs of a multi-PR change leave some
// tasks unchecked and therefore pass; only the PR that checks the last task is
// required to carry the `openspec archive` commit.
//
// Pass --defer (or OPENSPEC_DEFER_ARCHIVE=true) to downgrade the failure to a
// warning — used when a PR carries the `openspec:defer-archive` label.
//
// Pass --list-complete to instead print the names of complete-but-un-archived
// changes (one per line) and exit 0 — used by the archive workflow to resolve
// which change `/archive` should target.
//
// Read-only. Run locally with: node .github/scripts/openspec-archive-gate.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const deferred =
  process.argv.includes('--defer') ||
  /^(1|true|yes)$/i.test(process.env.OPENSPEC_DEFER_ARCHIVE ?? '');

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const changesDir = join(repoRoot, 'openspec', 'changes');

/** Directory names of active (non-archived) changes. */
function activeChanges() {
  let entries;
  try {
    entries = readdirSync(changesDir, { withFileTypes: true });
  } catch {
    return []; // no openspec/changes directory yet
  }
  return entries
    .filter((e) => e.isDirectory() && e.name !== 'archive')
    .map((e) => e.name);
}

/**
 * Task completeness for a change, read straight from its tasks.md checkboxes.
 * Returns null when there are no task lines (nothing to complete / no gate).
 */
function completeness(change) {
  const tasksPath = join(changesDir, change, 'tasks.md');
  let content;
  try {
    if (!statSync(tasksPath).isFile()) return null;
    content = readFileSync(tasksPath, 'utf8');
  } catch {
    return null;
  }
  let total = 0;
  let unchecked = 0;
  for (const line of content.split('\n')) {
    const m = /^\s*[-*]\s+\[( |x|X)\]/.exec(line);
    if (!m) continue;
    total += 1;
    if (m[1] === ' ') unchecked += 1;
  }
  if (total === 0) return null;
  return { total, unchecked, complete: unchecked === 0 };
}

const violations = [];
for (const change of activeChanges()) {
  const status = completeness(change);
  if (status?.complete) violations.push(change);
}

if (process.argv.includes('--list-complete')) {
  console.log(violations.join('\n'));
  process.exit(0);
}

if (violations.length === 0) {
  console.log('OpenSpec archive gate: OK — no completed change is left un-archived.');
  process.exit(0);
}

// GitHub workflow commands (`::error::` / `::warning::`) treat the message as a
// single line: a raw newline ends the command and the rest leaks to the log as
// plain text. Percent-encode so multi-line details land inside the annotation.
// https://docs.github.com/actions/reference/workflow-commands-for-github-actions
const encodeCmd = (s) =>
  s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

const list = violations.map((c) => `  - ${c}`).join('\n');
const message =
  `OpenSpec archive gate: the following change(s) are complete but not archived:\n${list}\n\n` +
  `Run \`openspec archive -y <change>\` (or comment \`/archive\` on the PR) so the ` +
  `delta specs fold into openspec/specs/ before this merges.`;

if (deferred) {
  console.warn(
    `::warning::${encodeCmd(`${message}\n(Deferred via openspec:defer-archive — not blocking.)`)}`,
  );
  process.exit(0);
}

console.error(`::error::${encodeCmd(message)}`);
process.exit(1);
