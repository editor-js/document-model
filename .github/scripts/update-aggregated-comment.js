async function updateAggregatedComment(unitTestRow, mutationRow, packageName, pr, core, github, context) {
  // repo info (owner/repo) available from context
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  if (!pr) {
    core.info('No pull request found in context or associated with the commit; skipping comment step.');
    return;
  }

  // list comments on the PR (first page)
  const res = await github.rest.issues.listComments({ owner, repo, issue_number: Number(pr), per_page: 100 });
  const comments = res && res.data ? res.data : [];

  const globalStart = `<!-- AGGREGATED REPORT -->`;
  const globalEnd = `<!-- END AGGREGATED REPORT -->`;

  // Table section markers
  const unitTestsStart = `<!-- UNIT TESTS TABLE -->`;
  const unitTestsEnd = `<!-- END UNIT TESTS TABLE -->`;
  const mutationTestsStart = `<!-- MUTATION TESTS TABLE -->`;
  const mutationTestsEnd = `<!-- END MUTATION TESTS TABLE -->`;

  // Table headers and separators
  const unitTestsHeader = `| Package | Coverage | Delta |`;
  const mutationTestsHeader = `| Package | Mutation score | Dashboard URL |`;
  const separator = `| --- | --- | --- |`;

  // find existing global comment containing the aggregated markers
  let existing = comments.find(c => c.body && c.body.includes(globalStart) && c.body.includes(globalEnd));

  let commentBody;

  if (!existing) {
    // create a new global comment with both tables
    const unitTestsTable = `${unitTestsStart}\n${unitTestsHeader}\n${separator}\n${unitTestRow}\n${unitTestsEnd}`;
    const mutationTestsTable = `${mutationTestsStart}\n${mutationTestsHeader}\n${separator}\n${mutationRow}\n${mutationTestsEnd}`;

    commentBody = `${globalStart}\n## Unit Tests\n${unitTestsTable}\n\n## Mutation Tests\n${mutationTestsTable}\n${globalEnd}`;
    await github.rest.issues.createComment({ owner, repo, issue_number: Number(pr), body: commentBody });
    core.info('Created new aggregated PR comment with test tables.');
    return;
  }

  // Update existing comment
  commentBody = existing.body || '';

  // Helper function to update or create a table section
  function updateTableSection(body, sectionStart, sectionEnd, header, separator, newRow, pkgName) {
    const sectionStartIdx = body.indexOf(sectionStart);

    if (sectionStartIdx === -1) {
      // Table section doesn't exist, create it with header, separator, and new row
      const tableContent = `${sectionStart}\n${header}\n${separator}\n${newRow}\n${sectionEnd}`;

      // Insert before the global end marker
      const globalEndIdx = body.indexOf(globalEnd);
      if (globalEndIdx === -1) {
        return body + '\n\n' + tableContent;
      }
      return body.substring(0, globalEndIdx) + '\n' + tableContent + '\n' + body.substring(globalEndIdx);
    }

    // Table section exists, find and update or append row
    const sectionEndIdx = body.indexOf(sectionEnd, sectionStartIdx);
    const beforeSection = body.substring(0, sectionStartIdx + sectionStart.length);
    const afterSection = body.substring(sectionEndIdx);
    const sectionContent = body.substring(sectionStartIdx + sectionStart.length, sectionEndIdx);

    // Split into lines and find the data row for this package
    const lines = sectionContent.split('\n');
    let packageRowLineIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Data rows: contain pipes, contain package name, and don't contain dashes (separator indicator)
      if (line.includes('|') && line.includes(pkgName) && !line.includes('---')) {
        packageRowLineIdx = i;
        break;
      }
    }

    if (packageRowLineIdx !== -1) {
      // Replace existing package row
      lines[packageRowLineIdx] = newRow;
    } else {
      // Append new package row
      lines.push(newRow);
    }

    return beforeSection + lines.join('\n') + afterSection;
  }

  // Update unit tests table
  commentBody = updateTableSection(
    commentBody,
    unitTestsStart,
    unitTestsEnd,
    unitTestsHeader,
    separator,
    unitTestRow,
    packageName
  );

  // Update mutation tests table
  commentBody = updateTableSection(
    commentBody,
    mutationTestsStart,
    mutationTestsEnd,
    mutationTestsHeader,
    separator,
    mutationRow,
    packageName
  );

  await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body: commentBody });
  core.info('Updated aggregated PR comment with test tables.');
}

export { updateAggregatedComment };
