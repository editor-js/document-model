#!/usr/bin/env node

function generateReport(package, testMessage, mutationMessage) {
  let md = '';

  md += `<!-- ${package} REPORT -->\n`;
  md += `## ${package}\n\n`;

  md += `### Unit tests report\n ${testMessage}\n\n`;

  if (mutationMessage !== '') {
    md += `### Mutation tests report\n${mutationMessage}\n\n`;
  }


  md += `<!-- END ${package} REPORT -->\n`;

  return md;
}

module.exports = { generateReport };

