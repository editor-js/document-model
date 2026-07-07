import fs from 'fs';
import path from 'path';

function findCoverageJson(dir) {
  if (!dir) return null;
  const report = path.join(dir, 'coverage', 'coverage-summary.json');

  if (fs.existsSync(report)) {
    try {
      return JSON.parse(fs.readFileSync(report, 'utf8'));
    } catch (err) {
      console.error(err);
    }
  }

  return null;
}


function pctFromCoverageSummary(obj, category) {
  if (!obj) return null;

  if (obj.total && obj.total[category] && typeof obj.total[category].pct === 'number') return obj.total[category].pct;

  if (obj[category] && typeof obj[category].pct === 'number') return obj[category].pct;

  return null;
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

export function processReports(pkg, headDir, baseDir) {
  const headCov = findCoverageJson(headDir);
  const baseCov = findCoverageJson(baseDir);

  const categories = compute(headCov, baseCov);

  const headPct = categories.branches.head != null ? `${categories.branches.head}%` : 'N/A';

  let delta = categories.branches.delta;

  if (delta > 0) {
    delta = `+${delta}% 🟢`;
  } else if (delta < 0) {
    delta = `${delta}% 🔴`;
  } else if (delta === 0) {
    delta = `0% ⚪️`;
  }

  // | Package | Branches coverage | Delta |
  return `| ${pkg} | ${headPct} | ${delta} |`;
}


