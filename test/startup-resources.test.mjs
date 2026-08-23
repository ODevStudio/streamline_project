import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('route-only vendors and pages are absent from the startup preload list', () => {
    const index = read('index.html');
    assert.doesNotMatch(index, /rel="preload"/);
    assert.doesNotMatch(index, /<script[^>]+(?:easymde|iro\.min)/);
    assert.doesNotMatch(index, /<link[^>]+easymde\.min\.css/);
});

test('font faces use WOFF2 with swap and no browser TTF references', () => {
    const css = read('src/css/main.css');
    assert.doesNotMatch(css, /url\([^)]*\.ttf/);
    assert.equal((css.match(/font-display: swap/g) || []).length, 11);
    for (const name of ['Inter-Regular', 'Inter-SemiBold', 'Inter-Bold', 'NotoSansMono-SemiBold']) {
        assert.equal(existsSync(new URL(`src/ui/${name}.woff2`, root)), true);
    }
});

test('process-lifetime chart and profile listeners use stable identities', () => {
    const chart = read('src/modules/chart.js');
    const profiles = read('src/modules/profile_selector.js');
    const settings = read('src/settings/settings.js');
    assert.match(chart, /window\.addEventListener\('resize', handleChartWindowResize\)/);
    assert.match(chart, /document\.addEventListener\('streamline:languagechange', handleChartLanguageChange\)/);
    assert.match(profiles, /new WeakSet\(\)/);
    assert.match(profiles, /document\.addEventListener\('profiles-updated', handleProfilesUpdated\)/);
    assert.doesNotMatch(profiles, /document\.addEventListener\('profiles-updated', \(\) =>/);
    assert.match(settings, /if \(!settingsLanguageListenerInstalled\)/);
    assert.match(settings, /document\.addEventListener\('streamline:languagechange', handleSettingsLanguageChange\)/);
});

test('notes confirmation reads the plain textarea when EasyMDE is unavailable', () => {
    const notes = read('src/modules/notes-modal.js');
    assert.match(notes, /easyMDE\?\.value\(\) \?\?/);
    assert.match(notes, /loadEasyMDE\(\)/);
});

test('startup settings prefetch reuses the workflow loaded for the dashboard', () => {
    const app = read('src/modules/app.js');
    assert.match(app, /const workflow = await loadInitialData\(\);/);
    assert.match(app, /prefetchSettingsToIDB\(initialWorkflow\)/);
    assert.match(app, /workflow \? Promise\.resolve\(workflow\) : getWorkflow\(\)/);
});
