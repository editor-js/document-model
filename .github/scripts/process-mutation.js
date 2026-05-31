import fs from 'fs';

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


function processMutationReport(reportPath, changedFilesPath) {
  if (!fs.existsSync(reportPath)) {
    return '';
  }

  const raw = fs.readFileSync(reportPath, 'utf8');
  const obj = JSON.parse(raw);
  const changedFiles = JSON.parse(fs.readFileSync(changedFilesPath, 'utf8'));

  if (changedFiles.length === 0) {
    return 'No files to mutate found.';
  }

  const metrics = getMetrics(obj);

  let message = `Mutation tests run with mutation score ${metrics.score}%.\n`;

  if (metrics.survived) {
    message += `Survived mutants: ${metrics.survived}\n`;
  }

  if (metrics.notCovered) {
    message += `Not covered mutants: ${metrics.notCovered}\n`;
  }

  if (metrics.score < metrics.thresholds.low) {
    message += `> [!CAUTION]\n> Mutation score is below the low threshold of ${metrics.thresholds.low}%\n`;
  } else if (metrics.score < metrics.thresholds.high) {
    message += `> [!WARNING]\n> Mutation score is below the high threshold of ${metrics.thresholds.low}%\n`;
  }


  return message;
}

module.exports = { processMutationReport };

// If invoked directly from CLI, read the first arg as the report path and print JSON
if (require.main === module) {
  const reportPath = process.argv[2];
  const res = processMutationReport(reportPath);
  console.log(JSON.stringify(res, null, 2));
}

