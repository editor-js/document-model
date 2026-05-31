#!/usr/bin/env node
// .github/scripts/update-aggregated-comment.js
// Exports: updateAggregatedComment(report, packageName, prNumber)

const core = require('@actions/core');
const github = require('@actions/github');

async function updateAggregatedComment(report, packageName, prNumber) {
  if (!report) {
    core.info('No report provided, skipping comment update.');
    return;
  }

  // repo info (owner/repo) available from context
  const owner = github.context.repo.owner;
  const repo = github.context.repo.repo;

  // Allow caller to pass the PR number (from workflow / another action). If not provided,
  // resolve PR number from the GitHub context. For push events there is no pull_request
  // payload, so we attempt to find an associated PR by commit SHA as a fallback.
  let pr;

  if (prNumber) {
    const parsed = Number(prNumber);
    if (!Number.isNaN(parsed) && parsed > 0) {
      pr = parsed;
    }
  }

  if (!pr) {
    pr = (github.context.payload.pull_request && github.context.payload.pull_request.number) || github.context.issue.number;
  }

  if (!pr) {
    const sha = github.context.sha;
    if (sha) {
      try {
        const assoc = await github.rest.repos.listPullRequestsAssociatedWithCommit({ owner, repo, commit_sha: sha });
        if (assoc && Array.isArray(assoc.data) && assoc.data.length > 0) {
          // Prefer an open PR if available
          const prObj = assoc.data.find(p => p.state === 'open') || assoc.data[0];
          pr = prObj.number;
        }
      } catch (e) {
        core.info('Error while searching for PR associated with commit: ' + String(e));
      }
    }
  }

  if (!pr) {
    core.info('No pull request found in context or associated with the commit; skipping comment step.');
    return;
  }

  // list comments on the PR (first page)
  const res = await github.rest.issues.listComments({ owner, repo, issue_number: Number(pr), per_page: 100 });
  const comments = res && res.data ? res.data : [];

  const globalStart = `<!-- AGGREGATED REPORT -->`;
  const globalEnd = `<!-- END AGGREGATED REPORT -->`;

  // find existing global comment containing the aggregated markers
  let existing = comments.find(c => c.body && c.body.includes(globalStart) && c.body.includes(globalEnd));

  if (!existing) {
    // create a new global comment that will hold all package sections
    const body = `${globalStart}\n${report}\n${globalEnd}`;
    await github.rest.issues.createComment({ owner, repo, issue_number: Number(pr), body });
    core.info('Created new aggregated PR comment with report.');
    return;
  }

  // Update existing aggregated comment: replace package section if present, otherwise insert before global end marker
  const body = existing.body || '';
  const pkgStart = `<!-- ${packageName} REPORT -->`;
  const pkgEnd = `<!-- END ${packageName} REPORT -->`;
  const psi = body.indexOf(pkgStart);
  const pei = body.indexOf(pkgEnd);
  let newBody;

  if (psi !== -1 && pei !== -1 && pei > psi) {
    // replace existing package section
    const before = body.substring(0, psi);
    const after = body.substring(pei + pkgEnd.length);

    newBody = before + report + after;
  } else {
    // insert the package section just before the global end marker
    const gi = body.indexOf(globalEnd);

    if (gi === -1) {
      // malformed existing comment, append at end
      newBody = body + '\n\n' + report;
    } else {
      newBody = body.substring(0, gi) + report + '\n' + body.substring(gi);
    }
  }

  await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body: newBody });
  core.info('Updated aggregated PR comment with report.');
}

module.exports = { updateAggregatedComment };
