import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('scaling reveals on the first frame and only defers the WebView correction', () => {
    const scaling = read('src/modules/scaling.js');
    const initialScale = scaling.indexOf('    updateScale();');
    const reveal = scaling.indexOf("content.classList.add('scaled')", initialScale);
    const correction = scaling.indexOf('setTimeout(updateScale, 250)', reveal);

    assert.ok(initialScale >= 0 && reveal > initialScale && correction > reveal);
    assert.doesNotMatch(scaling, /setTimeout\(\(\) => \{\s*updateScale\(\);\s*setTimeout/s);
});

test('the application canvas has no full-surface opacity transition', () => {
    const css = read('src/css/main.css');
    const scaledContentRule = css.match(/#scaled-content\s*\{([^}]*)\}/)?.[1] || '';
    const revealedRule = css.match(/#scaled-content\.scaled\s*\{([^}]*)\}/)?.[1] || '';

    assert.doesNotMatch(scaledContentRule, /opacity|transition/);
    assert.doesNotMatch(revealedRule, /opacity|transition/);
});

test('bootstrap scales before asynchronous initialization and preferences do not block paint', () => {
    const app = read('src/modules/app.js');
    const bootstrap = app.slice(app.indexOf("document.addEventListener('DOMContentLoaded', async"));
    const scaling = bootstrap.indexOf('initScaling();');
    const firstAwait = bootstrap.indexOf('await ');

    assert.ok(scaling >= 0 && firstAwait > scaling);
    assert.match(bootstrap, /\n\s*initI18n\(\);\s*\n\s*initUnits\(\);/);
    assert.doesNotMatch(bootstrap, /await init(?:I18n|Units)\(\)/);
});

test('translations use the browser cache and retain a parsed per-language dictionary', () => {
    const i18n = read('src/modules/i18n.js');

    assert.doesNotMatch(i18n, /cache:\s*['"]no-cache['"]/);
    assert.match(i18n, /translationDictionary:v\$\{TRANSLATION_CACHE_VERSION\}/);
    assert.match(i18n, /JSON\.stringify\(\{ language, \.\.\.parsed \}\)/);
    assert.match(i18n, /loadCachedTranslations\(initialLang\)/);
});
