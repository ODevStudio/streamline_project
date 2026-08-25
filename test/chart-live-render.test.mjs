import assert from 'node:assert/strict';
import { test } from 'node:test';

test('live chart frames use one paint-aligned update and defer while hidden', async () => {
    const chartElement = { offsetParent: {}, clientWidth: 960, clientHeight: 390 };
    const mainPage = {
        style: { display: 'block' },
        querySelector: selector => selector === '#plotly-chart' ? chartElement : null
    };
    const documentTarget = new EventTarget();
    Object.assign(documentTarget, {
        visibilityState: 'visible',
        getElementById: id => id === 'main-page' ? mainPage : null,
        createElement: () => ({
            style: {},
            getContext: () => ({ measureText: text => ({ width: text.length * 8 }) })
        })
    });
    const windowTarget = new EventTarget();
    Object.assign(windowTarget, { getComputedStyle: () => ({ visibility: 'visible', display: 'block' }) });

    globalThis.document = documentTarget;
    globalThis.window = windowTarget;
    globalThis.localStorage = { getItem: () => 'light' };
    globalThis.performance = { now: () => 1000 };
    globalThis.requestAnimationFrame = callback => setTimeout(() => callback(1000), 0);
    globalThis.cancelAnimationFrame = clearTimeout;

    const calls = [];
    globalThis.Plotly = {
        react: async (_element, traces) => calls.push({ method: 'react', lengths: traces.map(trace => trace.x.length) }),
        update: async (_element, data, layout) => calls.push({ method: 'update', lengths: data.x.map(values => values.length), layout })
    };

    const chart = await import(`../src/modules/chart.js?live-render=${Date.now()}`);
    chart.initChart();
    chart.clearChart();
    await new Promise(resolve => setTimeout(resolve, 0));

    const start = new Date('2026-01-01T00:00:00.000Z');
    const frame = seconds => ({
        timestamp: new Date(start.getTime() + seconds * 1000).toISOString(),
        state: { substate: 'pouring' },
        pressure: seconds,
        flow: seconds / 2,
        targetPressure: 9,
        targetFlow: 0,
        groupTemperature: 9200
    });

    chart.updateChart(start, frame(1), 1);
    chart.updateChart(start, frame(2), 2);
    chart.updateChart(start, frame(3), 3);
    await new Promise(resolve => setTimeout(resolve, 20));

    assert.equal(calls.filter(call => call.method === 'update').length, 1);
    assert.deepEqual(calls.at(-1).lengths, [3, 3, 3, 3, 3, 0, 3]);
    assert.equal('paper_bgcolor' in calls.at(-1).layout, false);
    assert.deepEqual(calls.at(-1).layout['xaxis.range'].map(Math.round), [0, 3]);

    documentTarget.visibilityState = 'hidden';
    chart.updateChart(start, frame(4), 4);
    await new Promise(resolve => setTimeout(resolve, 120));
    assert.equal(calls.filter(call => call.method === 'update').length, 1);

    documentTarget.visibilityState = 'visible';
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    await new Promise(resolve => setTimeout(resolve, 120));
    assert.equal(calls.filter(call => call.method === 'update').length, 2);
    assert.deepEqual(calls.at(-1).lengths, [4, 4, 4, 4, 4, 0, 4]);
});
