function generateReport(pkg, testMessage, mutationMessage) {
  let md = '';

  md += `<!-- ${pkg} REPORT -->\n`;
  md += `## ${pkg}\n\n`;

  md += `### Unit tests report\n ${testMessage}\n\n`;

  if (mutationMessage !== '') {
    md += `### Mutation tests report\n${mutationMessage}\n\n`;
  }


  md += `<!-- END ${pkg} REPORT -->\n`;

  return md;
}

export { generateReport };

