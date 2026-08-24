const charts = new WeakMap();

function dimensions(element) {
    return {
        width: Math.max(1, Math.round(element.clientWidth)),
        height: Math.max(1, Math.round(element.clientHeight))
    };
}

function dashType(dash) {
    if (dash === 'dot') return 'dotted';
    if (dash === 'dash' || dash === 'longdash') return 'dashed';
    return 'solid';
}

function axisOption(config, font, isX) {
    const range = config.autorange !== true && config.range ? config.range : null;
    return {
        type: 'value',
        min: range?.[0],
        max: range?.[1],
        interval: config.dtick,
        scale: !isX,
        axisLabel: {
            color: font.color,
            fontFamily: 'Inter, sans-serif',
            fontSize: 16,
            showMaxLabel: !isX,
            formatter: isX || !config.ticksuffix ? '{value}' : `{value}${config.ticksuffix}`
        },
        axisLine: { show: true, lineStyle: { color: config.linecolor } },
        axisTick: { show: true, lineStyle: { color: config.tickcolor } },
        splitLine: { show: true, lineStyle: { color: config.gridcolor, width: 1 } },
        boundaryGap: false,
        silent: true
    };
}

function annotationFor(trace, layout) {
    const last = trace.x.length - 1;
    if (last < 0) return null;
    const annotations = layout.annotations || [];
    const color = trace.line?.color?.toLowerCase();
    const colorMatch = annotations.find((annotation) => annotation.font?.color?.toLowerCase() === color);
    if (colorMatch) return colorMatch;
    const coordinateMatches = annotations.filter((annotation) =>
        annotation.x === trace.x[last] && annotation.y === trace.y[last]
    );
    return coordinateMatches.length === 1 ? coordinateMatches[0] : null;
}

function annotationPositions(layout, height) {
    const annotations = layout.annotations || [];
    if (!annotations.length) return new Map();
    const margin = layout.margin || {};
    const range = layout.yaxis?.range || [0, 10];
    const span = range[1] - range[0];
    const plotHeight = Math.max(1, height - (margin.t || 0) - (margin.b || 0));
    const padding = 10 * span / plotHeight;
    const separation = 18 * span / plotHeight;
    const minimum = range[0] + padding;
    const maximum = range[1] - padding;
    const sorted = [...annotations].sort((a, b) => a.y - b.y);
    const forward = sorted.reduce((positions, annotation) => {
        const previous = positions.at(-1)?.y ?? -Infinity;
        return [...positions, { annotation, y: Math.max(annotation.y, minimum, previous + separation) }];
    }, []);
    const overflow = Math.max(0, (forward.at(-1)?.y ?? maximum) - maximum);
    const shifted = forward.map((item) => ({ ...item, y: item.y - overflow }));
    const underflow = Math.max(0, minimum - (shifted[0]?.y ?? minimum));
    return new Map(shifted.map((item) => [item.annotation, item.y + underflow]));
}

function markerOptions(layout) {
    const shapes = layout.shapes || [];
    if (!shapes.length) return undefined;
    return {
        silent: true,
        symbol: ['none', 'none'],
        label: { show: false },
        data: shapes.map((shape) => ({
            xAxis: shape.x0,
            lineStyle: {
                color: shape.line?.color,
                width: shape.line?.width || 1,
                type: dashType(shape.line?.dash)
            }
        }))
    };
}

function seriesOption(trace, layout, index, interactive, positions) {
    const annotation = annotationFor(trace, layout);
    const last = trace.x.length - 1;
    const showLivePoint = !annotation && !(layout.annotations || []).length && last >= 0 && !trace.line?.dash;
    const livePointColor = showLivePoint
        ? window.echarts.color?.lift(trace.line?.color, 0.2) || trace.line?.color
        : null;
    const lineWidth = (trace.line?.width || 2) + 1;
    return {
        id: `trace-${index}`,
        name: trace.name,
        type: 'line',
        data: trace.x.map((x, pointIndex) => [x, trace.y[pointIndex]]),
        showSymbol: false,
        symbol: 'none',
        sampling: 'lttb',
        smooth: false,
        connectNulls: false,
        silent: !interactive,
        clip: true,
        lineStyle: {
            color: trace.line?.color,
            width: lineWidth,
            type: dashType(trace.line?.dash)
        },
        endLabel: showLivePoint ? {
            show: true,
            formatter: ' ',
            distance: 0,
            width: (lineWidth + 2) * 2,
            height: (lineWidth + 2) * 2,
            padding: 0,
            color: 'transparent',
            backgroundColor: livePointColor,
            borderColor: trace.line?.color,
            borderWidth: 1,
            borderRadius: lineWidth + 2,
            shadowBlur: 8,
            shadowColor: livePointColor
        } : { show: false },
        emphasis: { disabled: !interactive },
        markLine: index === 0 ? markerOptions(layout) : undefined,
        markPoint: annotation ? {
            silent: true,
            symbol: 'circle',
            symbolSize: 1,
            itemStyle: { color: 'transparent', borderWidth: 0 },
            label: {
                show: true,
                formatter: annotation.text,
                position: 'right',
                distance: annotation.xshift || 6,
                color: annotation.font?.color || trace.line?.color,
                fontFamily: 'Inter, sans-serif',
                fontSize: annotation.font?.size || 16
            },
            data: [{ coord: [annotation.x, positions.get(annotation)] }]
        } : undefined
    };
}

function chartOption(traces, layout, interactive, size) {
    const margin = layout.margin || {};
    const font = layout.font || {};
    const positions = annotationPositions(layout, size.height);
    return {
        animation: true,
        animationDuration: 0,
        animationDurationUpdate: 100,
        animationEasingUpdate: 'linear',
        backgroundColor: layout.paper_bgcolor || layout.plot_bgcolor || 'transparent',
        textStyle: { color: font.color, fontFamily: 'Inter, sans-serif' },
        grid: {
            left: margin.l || 50,
            right: margin.r || 50,
            top: margin.t || 20,
            bottom: margin.b || 40,
            containLabel: false
        },
        legend: layout.showlegend ? {
            show: true,
            top: 8,
            left: margin.l || 50,
            textStyle: { color: font.color, fontFamily: 'Inter, sans-serif', fontSize: 20 }
        } : { show: false },
        tooltip: interactive ? { show: true, trigger: 'axis', animation: false } : { show: false },
        xAxis: axisOption(layout.xaxis || {}, font, true),
        yAxis: axisOption(layout.yaxis || {}, font, false),
        series: traces.map((trace, index) => seriesOption(trace, layout, index, interactive, positions))
    };
}

export function renderChart(element, traces, layout, interactive = false) {
    const size = dimensions(element);
    let state = charts.get(element);
    element.style.background = layout.paper_bgcolor || layout.plot_bgcolor || 'transparent';

    if (!state) {
        element.replaceChildren();
        const chart = window.echarts.init(element, null, {
            renderer: 'canvas',
            devicePixelRatio: Math.min(window.devicePixelRatio, 1.25),
            width: size.width,
            height: size.height
        });
        state = { chart, size };
        charts.set(element, state);
    } else if (size.width !== state.size.width || size.height !== state.size.height) {
        state.chart.resize({ ...size, silent: true });
        state = { ...state, size };
        charts.set(element, state);
    }

    if (traces.every((trace) => trace.x.length === 0)) state.chart.clear();
    state.chart.setOption(chartOption(traces, layout, interactive, size), {
        notMerge: false,
        replaceMerge: ['series'],
        lazyUpdate: false,
        silent: true
    });
}

export function destroyChart(element) {
    const state = charts.get(element);
    if (!state) return;
    state.chart.dispose();
    charts.delete(element);
}
