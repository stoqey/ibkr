import { plot, PlotConfig } from 'asciichart';
import { MarketData } from '../interfaces';
import { log } from './log';
import isEmpty from 'lodash/isEmpty';

export const plotMkdCli = (data: MarketData[], opt?: PlotConfig) => {
    if (isEmpty(data)) {
        log('No data to plot');
        return;
    }
    // Extract close prices
    const prices = data.map(point => point.close);
    // Plot the chart
    log(plot(prices, { height: 10, ...opt }));
}

