import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const history = readFileSync(new URL('../src/modules/history.js', import.meta.url), 'utf8');
const idb = readFileSync(new URL('../src/modules/idb.js', import.meta.url), 'utf8');

test('history startup reads only one indexed summary page', () => {
    assert.match(history, /getLatestShotSummaries\(PAGE_SIZE\)/);
    assert.doesNotMatch(history, /getAllShots/);
    assert.match(idb, /index\('by_timestamp'\)[\s\S]*openCursor\(null, 'prev'\)/);
});

test('history pages use one bulk summary write', () => {
    assert.match(history, /const nextShots = data\.items \?\? \[\];\s*await addShots\(nextShots\)/);
    assert.match(idb, /const \{ measurements, \.\.\.summary \} = shot;/);
    assert.match(idb, /SHOT_SUMMARIES_STORE_NAME = 'shot_summaries'/);
    assert.doesNotMatch(idb, /deleteObjectStore\(EMAILS_STORE_NAME\)/);
});

test('version 9 seeds and backfills summaries from version 8 shots', () => {
    assert.match(idb, /event\.oldVersion > 0 && event\.oldVersion < 9/);
    assert.match(idb, /seedShotSummaries\(shotsStore, shotSummariesStore\)/);
    assert.match(idb, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
    assert.match(idb, /SUMMARY_BACKFILL_SIZE = 100/);
    assert.match(idb, /repairMissingSummarySeed/);
});
