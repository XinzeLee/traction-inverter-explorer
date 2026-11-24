import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mergeSnapshot, renderBlock, replaceBlock } from '../scripts/update-clone-stats.mjs';

test('overlapping snapshots replace daily totals and keep GitHub’s window-wide unique count', () => {
  const first = mergeSnapshot({}, { uniques: 2, clones: [
    { timestamp: '2026-11-20T00:00:00Z', count: 3 },
    { timestamp: '2026-11-21T00:00:00Z', count: 4 }
  ] }, '2026-11-22T06:17:00Z');
  const second = mergeSnapshot(first, { uniques: 3, clones: [
    { timestamp: '2026-11-21T00:00:00Z', count: 5 },
    { timestamp: '2026-11-22T00:00:00Z', count: 6 }
  ] }, '2026-11-29T06:17:00Z');
  assert.deepEqual(second.days, { '2026-11-20': 3, '2026-11-21': 5, '2026-11-22': 6 });
  assert.equal(second.uniqueLast14Days, 3);
  assert.equal(second.historyMayHaveGaps, false);
  const block = renderBlock(second, 'XinzeLee/traction-inverter-explorer');
  assert.match(block, /Total_Clones-14-7c3aed/);
  assert.match(block, /Unique_Clones-3-b45309/);
  assert.match(block, /GitHub traffic \(monitoring started on November 22, 2026\) · cumulative tracked clones · Till 2026-11-29 UTC/);
});

test('long interruptions are flagged and invalid API data is rejected', () => {
  const history = mergeSnapshot({ lastFetchedAt: '2026-11-01T00:00:00Z', days: {} }, { uniques: 0, clones: [] }, '2026-11-20T00:00:00Z');
  assert.equal(history.historyMayHaveGaps, true);
  assert.match(renderBlock(history, 'XinzeLee/traction-inverter-explorer'), /history may have gaps/);
  assert.throws(() => mergeSnapshot({}, { uniques: -1, clones: [] }, '2026-11-20T00:00:00Z'));
  assert.throws(() => mergeSnapshot({}, { uniques: 1, clones: [{ timestamp: 'invalid', count: 1 }] }, '2026-11-20T00:00:00Z'));
});

test('README replacement preserves surrounding text and refuses ambiguous markers', () => {
  const readme = 'Before\n<!-- clone-stats:start -->old<!-- clone-stats:end -->\nAfter';
  assert.equal(replaceBlock(readme, '<!-- clone-stats:start -->new<!-- clone-stats:end -->'), 'Before\n<!-- clone-stats:start -->new<!-- clone-stats:end -->\nAfter');
  assert.throws(() => replaceBlock('no markers', 'new'));
  assert.throws(() => replaceBlock(readme + readme, 'new'));
});

test('the updater writes the README and history from an authenticated API response', async () => {
  const dir = await mkdtemp(join(process.cwd(), '.clone-stats-test-'));
  try {
    await mkdir(join(dir, 'scripts'));
    await mkdir(join(dir, '.github'));
    await copyFile(new URL('../scripts/update-clone-stats.mjs', import.meta.url), join(dir, 'scripts', 'update-clone-stats.mjs'));
    await writeFile(join(dir, 'README.md'), 'Before\n<!-- clone-stats:start -->pending<!-- clone-stats:end -->\nAfter\n');
    const mock = join(dir, 'mock-fetch.mjs');
    await writeFile(mock, `globalThis.fetch = async (url, options) => {
      if (url !== 'https://api.github.com/repos/XinzeLee/traction-inverter-explorer/traffic/clones?per=day' || options.headers.Authorization !== 'Bearer test-token') throw new Error('Unexpected request');
      return { ok: true, json: async () => ({ uniques: 2, clones: [{ timestamp: '2026-11-20T00:00:00Z', count: 3 }] }) };
    };`);
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(mock).href, join(dir, 'scripts', 'update-clone-stats.mjs')], {
      cwd: dir, encoding: 'utf8', env: { ...process.env, TRAFFIC_STATS_TOKEN: 'test-token', GITHUB_REPOSITORY: 'XinzeLee/traction-inverter-explorer' }
    });
    assert.equal(result.status, 0, result.stderr);
    const readme = await readFile(join(dir, 'README.md'), 'utf8');
    const history = JSON.parse(await readFile(join(dir, '.github', 'clone-history.json'), 'utf8'));
    assert.match(readme, /Total_Clones-3-7c3aed/);
    assert.match(readme, /Unique_Clones-2-b45309/);
    assert.equal(history.days['2026-11-20'], 3);
    assert.doesNotMatch(readme, /test-token/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
