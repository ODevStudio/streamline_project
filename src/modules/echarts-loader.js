let echartsPromise = null;

function afterFirstAnimationFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
}

export function loadEChartsAfterFirstFrame() {
    if (!echartsPromise) {
        echartsPromise = afterFirstAnimationFrame()
            .then(() => import('./echarts-streamline.min.js'))
            .then(({ echarts }) => echarts);
    }
    return echartsPromise;
}
