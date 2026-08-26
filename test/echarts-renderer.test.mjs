import assert from 'node:assert/strict';
import { test } from 'node:test';

import { destroyChart, renderChart } from '../src/modules/echarts-renderer.js';

test('renderer preserves Plotly geometry, line styling, markers, labels, and capped DPR', () => {
    const calls = [];
    let initOptions;
    let disposed = false;
    const chart = {
        setOption: (option, settings) => calls.push({ option, settings }),
        resize() {},
        dispose: () => { disposed = true; }
    };
    const echarts = {
        init: (_element, _theme, options) => {
            initOptions = options;
            return chart;
        }
    };
    const element = {
        clientWidth: 800,
        clientHeight: 400,
        style: {},
        replaceChildren() {}
    };
    const traces = [
        { name: 'Pressure', x: [0, 1], y: [0, 8], line: { color: '#17c29a', width: 3 } },
        { name: 'Target Pressure', x: [0, 1], y: [0, 9], line: { color: '#8fd3bf', width: 2, dash: 'dot' } }
    ];
    const layout = {
        paper_bgcolor: '#0d0e14',
        font: { color: '#606579', size: 20 },
        margin: { l: 50, r: 60, t: 20, b: 40 },
        xaxis: { range: [0, 1.2], gridcolor: '#3D4255', linecolor: '#606579', tickcolor: '#606579' },
        yaxis: { range: [0, 10], gridcolor: '#3D4255', linecolor: '#606579', tickcolor: '#606579' },
        shapes: [{ xref: 'x', x0: 0.5, line: { color: '#7f8bbb', width: 2, dash: 'longdash' } }],
        annotations: [{ x: 1, y: 8, text: 'Pressure', xshift: 6, yshift: -4, font: { color: '#17c29a', size: 16 } }],
        showlegend: false
    };

    globalThis.window = { devicePixelRatio: 2 };
    renderChart(echarts, element, traces, layout);

    const option = calls[0].option;
    assert.equal(initOptions.renderer, 'canvas');
    assert.equal(initOptions.devicePixelRatio, 1.25);
    assert.deepEqual(option.grid[0], { left: 50, right: 60, top: 20, height: 340, containLabel: false });
    assert.equal(option.animation, false);
    assert.equal(option.xAxis[0].axisLabel.fontSize, 20);
    assert.equal(option.series[0].lineStyle.width, 3);
    assert.equal(option.series[1].lineStyle.type, 'dotted');
    assert.equal(option.series[0].markLine.data[0].lineStyle.type, 'dashed');
    assert.deepEqual(option.series[0].markPoint.label.offset, [0, 4]);
    assert.equal(option.series[1].markPoint, undefined);
    assert.equal(calls[0].settings.lazyUpdate, false);

    destroyChart(element);
    assert.equal(disposed, true);
});
