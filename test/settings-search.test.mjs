import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pluginKeywords, pluginListKeywords, subcategoryMatches } from '../src/modules/settings-search.js';

const source = readFileSync(new URL('../src/settings/settings.js', import.meta.url), 'utf8');

test('settings search keeps navigation stable and waits for explicit activation', () => {
    assert.doesNotMatch(source, /cloneNode\(/);
    assert.doesNotMatch(source, /restoreOriginalNavigation|updateNavigationWithResults/);
    assert.match(source, /dataset\.settingsSearchResults/);
    assert.match(source, /setTimeout\(\(\) => renderResults\(searchTerm\), 125\)/);
    assert.match(source, /event\.key !== 'Enter'/);
});

// The settings nav only knows page names, so searching for a setting used to
// require knowing which page holds it. Plugin name, description and manifest
// setting declarations (GET /plugins) are folded in as keywords -- the case that
// motivated this is typing "upload" and reaching the Visualizer plugin's
// AutoUpload setting.

const visualizer = {
    id: 'visualizer.reaplugin',
    name: 'Visualizer upload',
    description: 'Uploads the latest shot to Visualizer',
    settings: {
        Username: { type: 'string', description: 'Visualiser username' },
        Password: { type: 'string', secure: true, description: 'Visualiser password' },
        AutoUpload: { type: 'boolean', description: 'Upload shots automatically' },
        LengthThreshold: { type: 'number', description: 'Only upload shots longer than the threshold' },
    },
};

test('a plugin indexes its name, description and id', () => {
    const kw = pluginKeywords(visualizer);
    assert.ok(kw.includes('visualizer upload'));
    assert.ok(kw.includes('uploads the latest shot'));
    assert.ok(kw.includes('visualizer.reaplugin'));
});

test('setting names and their descriptions are indexed', () => {
    const kw = pluginKeywords(visualizer);
    assert.ok(kw.includes('autoupload'));
    assert.ok(kw.includes('threshold'));
    assert.ok(kw.includes('visualiser password'));
});

test('a PascalCase setting name is also indexed word by word', () => {
    // Without the split, searching "upload" would miss "AutoUpload".
    assert.ok(pluginKeywords(visualizer).includes('auto upload'));
    assert.ok(pluginKeywords({ settings: { Wake_lock: {} } }).includes('wake lock'));
});

test('everything indexed is lowercase, since the search term is lowercased', () => {
    const kw = pluginKeywords(visualizer);
    assert.equal(kw, kw.toLowerCase());
});

test('a plugin with no settings or no fields at all is harmless', () => {
    assert.equal(pluginKeywords(null), '');
    assert.equal(pluginKeywords({}), '');
    assert.equal(pluginKeywords({ name: 'Bare' }), 'bare');
});

test('the Plugins page answers for every installed plugin', () => {
    const kw = pluginListKeywords([visualizer, { id: 'dye2.reaplugin', name: 'DYE2' }]);
    assert.ok(kw.includes('autoupload'));
    assert.ok(kw.includes('dye2'));
    assert.deepEqual(pluginListKeywords(null), '');
});

test('a subcategory still matches on its own name and id', () => {
    const subcat = { id: 'extention2', name: 'Plugins', settingsCategory: 'plugins' };
    assert.equal(subcategoryMatches(subcat, 'plug'), true);
    assert.equal(subcategoryMatches(subcat, 'extention'), true);
    assert.equal(subcategoryMatches(subcat, 'upload'), false);
});

test('keywords make a plugin setting reachable from the page that hosts it', () => {
    const subcat = { id: 'extention1', name: 'Visualizer', keywords: pluginKeywords(visualizer) };
    assert.equal(subcategoryMatches(subcat, 'upload'), true);
    assert.equal(subcategoryMatches(subcat, 'threshold'), true);
    assert.equal(subcategoryMatches(subcat, 'grinder'), false);
});

test('matching is case-insensitive and an empty term matches everything', () => {
    const subcat = { id: 'extention1', name: 'Visualizer', keywords: pluginKeywords(visualizer) };
    assert.equal(subcategoryMatches(subcat, 'UPLOAD'), true);
    assert.equal(subcategoryMatches(subcat, ''), true);
});
