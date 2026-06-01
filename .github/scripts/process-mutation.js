import fs from 'fs';
import path from 'path';

function getMetrics(obj) {
  const mutants = [];

  if (obj.files) {
    for (const fileEntry of Object.values(obj.files)) {
      if (fileEntry && Array.isArray(fileEntry.mutants)) {
        mutants.push(...fileEntry.mutants);
      }
    }
  }

  const total = mutants.length;
  const survived = mutants.filter(m => m.status === 'Survived').length;
  const notCovered = mutants.filter(m => m.status === 'NoCoverage').length;
  const killed = mutants.filter(m => m.status === 'Killed').length;
  const timedOut = mutants.filter(m => m.status === 'TimedOut').length;

  const score = (killed + timedOut) / (killed + timedOut + notCovered + survived).toFixed(2);

  return {
    total,
    score,
    survived,
    notCovered,
    thresholds: obj.thresholds,
  };
}


function processMutationReport(artitfactName, reportPath, changedFilesPath, prNumber, packageName) {
  const reportFile = path.join(artitfactName, reportPath);
  const changedFilesFile = path.join(artitfactName, changedFilesPath);

  if (!fs.existsSync(changedFilesFile)) {
    return '';
  }
  const changedFiles = JSON.parse(fs.readFileSync(changedFilesFile, 'utf8'));

  if (changedFiles.length === 0) {
    return `| ${packageName} | No files to mutate found. | |`;
  }

  if (!fs.existsSync(reportFile)) {
    return `| ${packageName} | Report artifact not found. | |`;
  }

  const raw = fs.readFileSync(reportFile, 'utf8');
  const obj = JSON.parse(raw);


  const metrics = getMetrics(obj);

  const encodedPackageName = encodeURIComponent(packageName);
  const dashboardUrl = `[Dashboard](https://dashboard.stryker-mutator.io/reports/github.com/editor-js/document-model/PR-${prNumber}?module=${encodedPackageName})`;

  const score = (metrics.score * 100).toFixed(2);
  let scoreMessage = `${score}%`;

  switch (true) {
    case (score < metrics.thresholds.break):
      scoreMessage += ` <span title="Below break threshold (survived: ${metrics.survived}, not covered: ${metrics.notCovered})">❌</span>`;
      break;
    case (score < metrics.thresholds.low):
      scoreMessage += ` <span title="Below low threshold (survived: ${metrics.survived}, not covered: ${metrics.notCovered})">🔴</span>`;
      break;
    case (score < metrics.thresholds.high):
      scoreMessage += ` <span title="Below high threshold (survived: ${metrics.survived}, not covered: ${metrics.notCovered})">🟡</span>`;
      break;
    case (score > metrics.thresholds.high):
      scoreMessage += ` <span title="Above high threshold (survived: ${metrics.survived}, not covered: ${metrics.notCovered})">🟢</span>`;
      break;
  }

  // | Package | Mutation score | Dashboard URL |
  return `| ${packageName} | ${scoreMessage} | ${dashboardUrl} |`;
}

export { processMutationReport };
