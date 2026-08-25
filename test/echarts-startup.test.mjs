import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('cached shot read and ECharts readiness converge before first paint', () => {
    const history = read('src/modules/history.js');
    assert.match(history, /Promise\.all\(\[\s*readFromCacheFast\(\),\s*echartsReady\s*\]\)/);
    assert.match(history, /\]\);\s*paintCachedShot\(cachedShot\)/);
});

test('direct Settings startup does not request ECharts', () => {
    const app = read('src/modules/app.js');
    const router = read('src/modules/router.js');
    assert.match(app, /if \(!isSettingsRoute\(\)\) loadEChartsAfterFirstFrame\(\)/);
    assert.match(router, /export function isSettingsRoute\(\)/);
    assert.doesNotMatch(router, /settings\.html'[\s\S]{0,250}echartsReady/);
});

test('returning from Settings loads ECharts before dashboard chart work', () => {
    const router = read('src/modules/router.js');
    const showMain = router.slice(router.indexOf('function showMainPage()'), router.indexOf('export async function loadPage'));
    assert.match(showMain, /const chartReady = Promise\.resolve\(window\.app\?\.echartsReady\?\.\(\)\)/);
    assert.match(showMain, /chartReady\s*\.then\(\(\) => window\.app\?\.clearChart/);
    assert.match(showMain, /historyReady\?\.\(\)\s*\.then\(\(\) => chartReady\)/);
});
