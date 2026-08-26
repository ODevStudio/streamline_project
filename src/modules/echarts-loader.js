let echartsPromise;

export function loadECharts() {
    if (!echartsPromise) {
        echartsPromise = new Promise(resolve => requestAnimationFrame(resolve))
            .then(() => import('./echarts-streamline.min.js'))
            .then(({ echarts }) => echarts);
    }
    return echartsPromise;
}
