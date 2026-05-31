import fs from 'fs';
import path from 'path';

function findCoverageJson(dir) {
  if (!dir) return null;
  const report = path.join(dir, 'coverage', 'coverage-final.json');


  if (fs.existsSync(report)) {
    try {
      return JSON.parse(fs.readFileSync(report, 'utf8'));
    } catch (report) {
      // continue
    }
  }

  return null;
}

function findJestJsonResults(dir) {
  if (!dir) return null;

  const report = path.join(dir, 'jest-report.json')

  try {
      const raw = fs.readFileSync(report, 'utf8');
      const obj = JSON.parse(raw);

      if (typeof obj === 'object' && obj !== null) {
        const hasTests = ('numPassedTests' in obj) || ('numPassedTestSuites' in obj) || ('numPassedAssertions' in obj);
        const hasSuites = ('numPassedTestSuites' in obj) || ('testResults' in obj && Array.isArray(obj.testResults));

        if (hasTests || hasSuites) return obj;
      }
  } catch (e) {
    // ignore parse errors
  }

  return null;
}

function pctFromCoverageSummary(obj, category) {
  if (!obj) return null;

  if (obj.total && obj.total[category] && typeof obj.total[category].pct === 'number') return obj.total[category].pct;

  if (obj[category] && typeof obj[category].pct === 'number') return obj[category].pct;

  return null;
}

function extractPassedCounts(jestJson) {
  if (!jestJson) return { passedTests: null, passedSuites: null };
  const passedTests = ('numPassedTests' in jestJson) ? Number(jestJson.numPassedTests) : (jestJson.numPassedAssertions ? Number(jestJson.numPassedAssertions) : null);
  let passedSuites = null;
  if ('numPassedTestSuites' in jestJson) passedSuites = Number(jestJson.numPassedTestSuites);
  else if (Array.isArray(jestJson.testResults)) {
    passedSuites = jestJson.testResults.filter(r => r.status === 'passed').length;
  }
  return { passedTests: Number.isFinite(passedTests) ? passedTests : null, passedSuites: Number.isFinite(passedSuites) ? passedSuites : null };
}

function compute(headSummary, baseSummary) {
  const categories = ['statements', 'branches', 'functions', 'lines'];

  const out = {};

  for (const cat of categories) {
    const headPct = pctFromCoverageSummary(headSummary, cat);
    const basePct = pctFromCoverageSummary(baseSummary, cat);

    let delta = 'N/A';

    if (headPct != null && basePct != null) {
      delta = Number((headPct - basePct).toFixed(2));
    }

    out[cat] = { head: headPct, base: basePct, delta };
  }
  return out;
}

export function processReports(headDir, baseDir) {
  const headCov = findCoverageJson(headDir);
  const baseCov = findCoverageJson(baseDir);
  const headJest = findJestJsonResults(headDir);

  const categories = compute(headCov, baseCov);
  const headCounts = extractPassedCounts(headJest);

// prefer head counts; if missing, fallback to base counts; otherwise null
  const tests = {
    passedTests: headCounts.passedTests != null ? headCounts.passedTests : 'N/A',
    passedSuites: headCounts.passedSuites != null ? headCounts.passedSuites : 'N/A'
  };


  let message = `${tests.passedTests} tests passed in ${tests.passedSuites} suites.\n`

  message += `Branches coverage: ${categories.branches.head}\n`;

  let warning = '';

  for (const cat in categories) {
    if (categories[cat].delta < 0) {
      warning += `Coverage for ${cat} dropped by ${categories[cat].delta.toFixed(2)}%\n`;
    }
  }

  if (warning.length > 0) {
    message += `> [!WARNING]\n> ${message}\n`;
  }

  return message;
}


