import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('Plotly Basic is the only vendored Plotly build', () => {
    const index = read('index.html');
    const loader = read('src/modules/vendor-loader.js');
    const basic = new URL('src/modules/plotly-basic-3.1.0.min.js', root);
    assert.match(loader, /src\/modules\/plotly-basic-3\.1\.0\.min\.js/);
    assert.doesNotMatch(index, /src\/modules\/plotly-basic-3\.1\.0\.min\.js/);
    assert.doesNotMatch(index, /src\/modules\/plotly-3\.1\.0\.min\.js/);
    assert.equal(existsSync(new URL('src/modules/plotly-3.1.0.min.js', root)), false);
    assert.equal(statSync(basic).size, 1_036_463);
});

test('chart rendering uses supported traces and one topology-aware render path', () => {
    const chart = read('src/modules/chart.js');
    assert.doesNotMatch(chart, /type:\s*['"]lines['"]/);
    assert.match(chart, /const CHART_REDRAW_INTERVAL_MS = 100/);
    assert.equal((chart.match(/Plotly\.react\(/g) || []).length, 1);
    assert.equal((chart.match(/Plotly\.update\(/g) || []).length, 1);
    assert.equal((chart.match(/Plotly\.extendTraces\(/g) || []).length, 1);
    assert.match(chart, /traceCount !== traces\.length/);
    assert.match(chart, /renderMain\(chartTraces, layout, 'live'\)/);
    assert.match(chart, /Plotly\.relayout\(element, getLiveLayoutUpdate\(layout\)\)/);
    assert.match(chart, /requestedFullRevision > \(appliedFullRenderRevisions\.get\(element\) \|\| 0\)/);
});

test('live rendering is paint-aligned and skips hidden charts', () => {
    const chart = read('src/modules/chart.js');
    assert.match(chart, /const chartTraces = Object\.values\(chartData\)/);
    assert.match(chart, /if \(document\.visibilityState === 'hidden'\) return false/);
    assert.match(chart, /redrawFrame = requestAnimationFrame\(\(\) => \{\s*redrawFrame = 0;\s*flushChart\(\)/);
    assert.match(chart, /document\.addEventListener\('visibilitychange', handleChartVisibilityChange\)/);
    assert.match(chart, /const measuredLabelWidths = new Map\(\)/);
    assert.match(chart, /observedChartSize = \{ width: element\.clientWidth, height: element\.clientHeight \}/);
});

test('expanded mode renders only visible charts and restores a dirty main chart', () => {
    const chart = read('src/modules/chart.js');
    const index = read('index.html');
    assert.match(chart, /MAIN_CHART_CONFIG = \{ displayModeBar: false, responsive: false, staticPlot: true \}/);
    assert.match(chart, /EXPANDED_CHART_CONFIG = \{ displayModeBar: false, responsive: false, staticPlot: false \}/);
    assert.match(chart, /Plotly\.extendTraces/);
    assert.match(chart, /if \(element\) observeChartElement\(element\)/);
    assert.match(chart, /if \(!element \|\| element\.offsetParent === null \|\| expandedOpen\) \{\s*mainRenderDirty = true;\s*return;/);
    assert.match(chart, /if \(mainRenderDirty && latestMainRender && !expandedOpen\)/);
    assert.match(index, /id="expanded-chart"/);
    assert.doesNotMatch(index, /id="expanded-(flow|temp)-chart"/);
    assert.doesNotMatch(chart, /expandedSeries|expandedDataRev/);
    assert.match(chart, /renderPlotly\(element, \[\.\.\.expandedTopTraces\(\), \.\.\.expandedTempTraces\(\)\]/);
    assert.match(chart, /\.\.\.chartData\.pressure/);
    assert.match(chart, /pickVisible\(expandedTopSeriesYs\(\), visibility\)/);
    assert.match(chart, /plotly_legendclick/);
    assert.match(chart, /plotly_restyle/);
});

test('hidden main charts retain one pending render and flush when the main page returns', () => {
    const chart = read('src/modules/chart.js');
    const router = read('src/modules/router.js');
    assert.match(chart, /return document\.getElementById\('subpage-host'\)\?\.querySelector\('#plotly-chart'\) \?\? null/);
    assert.match(chart, /return mainPage\?\.querySelector\('#plotly-chart'\) \?\? null/);
    assert.match(chart, /document\.addEventListener\('streamline:mainpagevisible', flushDeferredChart\)/);
    assert.match(router, /document\.dispatchEvent\(new Event\('streamline:mainpagevisible'\)\)/);
});

test('chart teardown invalidates queued work before purge', () => {
    const chart = read('src/modules/chart.js');
    assert.match(chart, /renderGenerations\.set\(element, generation\);[\s\S]*await enqueue\?\.dispose\(\);[\s\S]*Plotly\.purge\(element\)/);
    assert.match(chart, /!element\.isConnected \|\| renderGenerations\.get\(element\) !== generation/g);
    assert.match(chart, /requestedFullRenderRevisions\.delete\(element\)/);
    assert.match(chart, /appliedFullRenderRevisions\.delete\(element\)/);
});
