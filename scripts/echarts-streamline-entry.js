import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
    GridComponent,
    LegendComponent,
    TooltipComponent,
    AxisPointerComponent,
    MarkLineComponent,
    MarkPointComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    LineChart,
    GridComponent,
    LegendComponent,
    TooltipComponent,
    AxisPointerComponent,
    MarkLineComponent,
    MarkPointComponent,
    CanvasRenderer
]);

window.echarts = echarts;

export { echarts };
