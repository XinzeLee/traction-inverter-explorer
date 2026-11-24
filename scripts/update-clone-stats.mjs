// GitHub exposes a rolling 14-day window. Keep daily totals so overlapping
// weekly snapshots do not double count, and display GitHub's 14-day unique count.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const readmePath = new URL('README.md', root);
const historyPath = new URL('.github/clone-history.json', root);
const start = '<!-- clone-stats:start -->';
const end = '<!-- clone-stats:end -->';

function count(value, description) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${description} from GitHub.`);
  return value;
}

export function mergeSnapshot(history, payload, now) {
  if (!payload || !Array.isArray(payload.clones)) throw new Error('Invalid GitHub clone response.');
  const unique = count(payload.uniques, 'unique clone count');
  const days = { ...(history.days || {}) };
  for (const row of payload.clones) {
    if (!row || !/^\d{4}-\d{2}-\d{2}T00:00:00Z$/.test(row.timestamp || '')) throw new Error('Invalid clone date from GitHub.');
    days[row.timestamp.slice(0, 10)] = count(row.count, 'daily clone count');
  }
  const last = history.lastFetchedAt && Date.parse(history.lastFetchedAt);
  if (history.lastFetchedAt && !Number.isFinite(last)) throw new Error('Invalid clone history timestamp.');
  const current = Date.parse(now);
  if (!Number.isFinite(current)) throw new Error('Invalid update timestamp.');
  return {
    firstFetchedAt: history.firstFetchedAt || now,
    lastFetchedAt: now,
    historyMayHaveGaps: Boolean(history.historyMayHaveGaps || (last && current - last > 14 * 86400000)),
    days: Object.fromEntries(Object.entries(days).sort(([a], [b]) => a.localeCompare(b))),
    uniqueLast14Days: unique
  };
}

export function renderBlock(history, repository) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid repository name.');
  const total = Object.values(history.days).reduce((sum, value) => sum + count(value, 'saved daily clone count'), 0);
  count(total, 'tracked clone total');
  const number = value => count(value, 'clone count').toLocaleString('en-US');
  const url = `https://github.com/${repository}/graphs/traffic`;
  const monitoringStart = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(history.firstFetchedAt));
  const details = `GitHub traffic (monitoring started on ${monitoringStart}) · cumulative tracked clones · Till ${history.lastFetchedAt.slice(0, 10)} UTC${history.historyMayHaveGaps ? ' · history may have gaps' : ''}`;
  return `${start}
<p align="center">
  <a href="${url}">
    <img src="https://img.shields.io/badge/Total_Clones-${number(total)}-7c3aed?style=flat-square" alt="Total tracked repository clones: ${number(total)}" />
  </a>
  <a href="${url}">
    <img src="https://img.shields.io/badge/Unique_Clones-${number(history.uniqueLast14Days)}-b45309?style=flat-square" alt="Unique repository cloners in the past 14 days: ${number(history.uniqueLast14Days)}" />
  </a>
</p>

<p align="center"><sub>${details}</sub></p>
${end}`;
}

export function replaceBlock(readme, block) {
  const first = readme.indexOf(start), last = readme.indexOf(end);
  if (first < 0 || last < first || readme.indexOf(start, first + start.length) !== -1 || readme.indexOf(end, last + end.length) !== -1) throw new Error('README clone statistics markers are missing or duplicated.');
  return readme.slice(0, first) + block + readme.slice(last + end.length);
}

async function main() {
  const token = process.env.TRAFFIC_STATS_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY || 'XinzeLee/traction-inverter-explorer';
  if (!token) throw new Error('Set the TRAFFIC_STATS_TOKEN repository secret with Administration: read permission.');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid repository name.');
  const response = await fetch(`https://api.github.com/repos/${repository}/traffic/clones?per=day`, {
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'traction-inverter-clone-stats' },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`GitHub clone API returned HTTP ${response.status}. Check TRAFFIC_STATS_TOKEN and its Administration: read access.`);
  const payload = await response.json();
  let previous = {};
  try { previous = JSON.parse(await readFile(historyPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const history = mergeSnapshot(previous, payload, new Date().toISOString());
  const readme = replaceBlock(await readFile(readmePath, 'utf8'), renderBlock(history, repository));
  await writeFile(historyPath, JSON.stringify(history, null, 2) + '\n');
  await writeFile(readmePath, readme);
  console.log('Updated clone statistics.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
