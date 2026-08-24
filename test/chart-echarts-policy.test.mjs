import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('Apache ECharts is local and the other chart engines are absent', () => {
    const index = read('index.html');
    const asset = new URL('src/modules/echarts-6.1.0.min.js', root);
    assert.match(index, /src\/modules\/echarts-6\.1\.0\.min\.js/);
    assert.doesNotMatch(index, /<script[^>]+(?:plotly|uPlot)/i);
    assert.equal(existsSync(new URL('src/modules/plotly-3.1.0.min.js', root)), false);
    assert.equal(existsSync(new URL('src/modules/uPlot.iife.min.js', root)), false);
    assert.equal(statSync(asset).size, 1_121_883);
});

test('ECharts renderer uses Canvas, line series, collision-safe labels, and step markers', () => {
    const renderer = read('src/modules/echarts-renderer.js');
    assert.match(renderer, /renderer: 'canvas'/);
    assert.match(renderer, /type: 'line'/);
    assert.match(renderer, /sampling: 'lttb'/);
    assert.match(renderer, /function annotationPositions/);
    assert.match(renderer, /markPoint:/);
    assert.match(renderer, /markLine:/);
    assert.match(renderer, /animation: false/);
});

test('chart orchestration remains capped and skips the hidden main chart', () => {
    const chart = read('src/modules/chart.js');
    assert.match(chart, /const CHART_REDRAW_INTERVAL_MS = 100/);
    assert.doesNotMatch(chart, /Plotly\.|uPlot/);
    assert.doesNotMatch(read('src/modules/profile_editor.js'), /Plotly\.|uPlot/);
    assert.doesNotMatch(read('src/modules/profile_selector.js'), /Plotly\.|uPlot/);
    assert.doesNotMatch(read('src/modules/ui.js'), /Plotly\.|uPlot/);
    assert.match(chart, /if \(expandedOpen\) \{\s*mainRenderDirty = true;\s*return;/);
    assert.match(chart, /if \(mainRenderDirty && latestMainRender\)/);
    assert.match(chart, /dtick: dtickForTime\(dataMax\)/);
    assert.doesNotMatch(chart, /requestAnimationFrame\(\(\) => \{\s*const t = document\.getElementById\('expanded-flow-chart'\)/);
});

test('chart module exports remain compatible', () => {
    const chart = read('src/modules/chart.js');
    const exports = [...chart.matchAll(/export function (\w+)\(/g)].map((match) => match[1]);
    assert.deepEqual(exports, [
        'finalizeLiveChart',
        'refreshLabelMargin',
        'isExpandedChartOpen',
        'openExpandedChart',
        'closeExpandedChart',
        'setCurrentProfile',
        'updateChart',
        'clearChart',
        'plotHistoricalShot',
        'plotProfile',
        'initChart',
        'setTheme'
    ]);
});
