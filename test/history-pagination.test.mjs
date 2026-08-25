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
