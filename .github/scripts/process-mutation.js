import fs from 'fs';
import path from 'path';

function normalizeStatusToCanonical(s) {
  if (s == null) return '';
  const st = String(s).toLowerCase();
  if (st.includes('surviv')) return 'Survived';
  if (st.includes('no') && st.includes('coverage')) return 'NoCoverage';
  if (st.includes('nocoverage')) return 'NoCoverage';
  if (st.includes('killed')) return 'Killed';
  if (st.includes('timeout')) return 'Timeout';
  if (st.includes('runtime')) return 'RuntimeError';
  if (st.includes('compile')) return 'CompileError';
  if (st.includes('ignored') || st.includes('skip')) return 'Ignored';
  if (st === 'survived') return 'Survived';
  if (st === 'killed') return 'Killed';
  // return original-ish with capitalization
  return String(s);
}

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

export { processMutationReport };

// If invoked directly from CLI, read the first arg as the report path and print JSON
if (require.main === module) {
  const reportPath = process.argv[2];
  const res = processMutationReport(reportPath);
  console.log(JSON.stringify(res, null, 2));
}

