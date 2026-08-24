import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const history = readFileSync(new URL('../src/modules/history.js', import.meta.url), 'utf8');

test('post-shot history refresh preserves the finished live chart', () => {
    const refresh = history.slice(
        history.indexOf('export async function refreshToNewestShot'),
        history.indexOf('export async function clearShotHistory')
    );

    assert.match(history, /async function displayShot\(index, \{ redrawChart = true \} = \{\}\)/);
    assert.match(history, /if \(redrawChart && paintedShotId !== shot\.id\)/);
    assert.equal([...refresh.matchAll(/displayShot\(0, \{ redrawChart: false \}\)/g)].length, 2);
    assert.match(history, /displayShot\(currentShotIndex - 1\);/);
});
