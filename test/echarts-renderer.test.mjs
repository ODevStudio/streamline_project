import test from 'node:test';
import assert from 'node:assert/strict';

import { renderChart } from '../src/modules/echarts-renderer.js';

test('live updates merge series and interpolate between 10 Hz redraws', () => {
    const calls = [];
    let clears = 0;
    let initOptions;
    const chart = {
        clear: () => { clears += 1; },
        setOption: (option, settings) => calls.push({ option, settings }),
        resize: () => {},
        dispose: () => {}
    };
    globalThis.window = {
        devicePixelRatio: 2,
        echarts: {
            color: { lift: () => '#44f' },
            init: (_element, _theme, options) => {
                initOptions = options;
                return chart;
            }
        }
    };
    const element = {
        clientWidth: 800,
        clientHeight: 400,
        style: {},
        replaceChildren: () => {}
    };
    const traces = [{ name: 'Flow', x: [0, 0.1], y: [0, 1], line: { color: '#00f' } }];
    const layout = {
        font: {},
        margin: {},
        xaxis: { range: [0, 1] },
        yaxis: { range: [0, 10] }
    };

    renderChart(element, traces, layout);

    assert.equal(calls[0].option.animationDurationUpdate, 100);
    assert.equal(calls[0].option.animationEasingUpdate, 'linear');
    assert.equal(initOptions.devicePixelRatio, 1.25);
    assert.equal(calls[0].settings.notMerge, false);
    assert.deepEqual(calls[0].settings.replaceMerge, ['series']);
    assert.equal(calls[0].option.series[0].lineStyle.width, 3);
    assert.equal(calls[0].option.series[0].endLabel.width, 10);
    assert.equal(calls[0].option.series[0].endLabel.shadowBlur, 8);
    assert.equal(calls[0].option.series[0].markPoint, undefined);

    renderChart(element, traces.map((trace) => ({ ...trace, x: [], y: [] })), layout);
    assert.equal(clears, 1);
});
