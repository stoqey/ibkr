import _ from 'lodash';
import { MarketData } from '../interfaces';

export interface AggregatedData extends MarketData {
  [key: string]: any;
}

type IntervalUnit = 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';

interface IntervalConfig {
  value: number;
  unit: IntervalUnit;
}

/**
 * Parse interval string like '1s', '5m', '1h', etc.
 */
export function parseInterval(interval: string = '1m'): IntervalConfig {
  const match = interval.match(/^(\d+)([smhdwMy])$/);
  if (!match) {
    throw new Error(`Invalid interval format: ${interval}. Use format like '1s', '5m', '1h', etc.`);
  }
  
  return {
    value: parseInt(match[1]),
    unit: match[2] as IntervalUnit
  };
}

/**
 * Get the start of an interval for a given date
 */
export function getIntervalStart(date: Date, config: IntervalConfig): Date {
  const d = new Date(date);
  
  switch (config.unit) {
    case 's':
      d.setSeconds(Math.floor(d.getSeconds() / config.value) * config.value);
      d.setMilliseconds(0);
      break;
    case 'm':
      d.setMinutes(Math.floor(d.getMinutes() / config.value) * config.value);
      d.setSeconds(0);
      d.setMilliseconds(0);
      break;
    case 'h':
      d.setHours(Math.floor(d.getHours() / config.value) * config.value);
      d.setMinutes(0);
      d.setSeconds(0);
      d.setMilliseconds(0);
      break;
    case 'd':
      d.setHours(0, 0, 0, 0);
      if (config.value > 1) {
        const daysSinceEpoch = Math.floor(d.getTime() / (86400000));
        const intervalStart = Math.floor(daysSinceEpoch / config.value) * config.value;
        d.setTime(intervalStart * 86400000);
      }
      break;
    case 'w':
      const dayOfWeek = d.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
      d.setDate(d.getDate() - diff);
      d.setHours(0, 0, 0, 0);
      if (config.value > 1) {
        const weeksSinceEpoch = Math.floor(d.getTime() / (604800000));
        const intervalStart = Math.floor(weeksSinceEpoch / config.value) * config.value;
        d.setTime(intervalStart * 604800000);
      }
      break;
    case 'M':
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      if (config.value > 1) {
        const monthsSinceEpoch = d.getFullYear() * 12 + d.getMonth();
        const intervalStart = Math.floor(monthsSinceEpoch / config.value) * config.value;
        d.setFullYear(Math.floor(intervalStart / 12));
        d.setMonth(intervalStart % 12);
      }
      break;
    case 'y':
      d.setMonth(0, 1);
      d.setHours(0, 0, 0, 0);
      if (config.value > 1) {
        d.setFullYear(Math.floor(d.getFullYear() / config.value) * config.value);
      }
      break;
  }
  
  return d;
}

/**
 * Default aggregators using lodash
 */
export const defaultAggregators = {
  sum: (values: number[]) => _.sum(values),
  mean: (values: number[]) => _.mean(values),
  avg: (values: number[]) => _.mean(values),  // Alias for mean
  average: (values: number[]) => _.mean(values),  // Another alias
  median: (values: number[]) => {
    const sorted = _.sortBy(values);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },
  min: (values: number[]) => _.min(values),
  max: (values: number[]) => _.max(values),
  first: (values: any[]) => _.first(values),
  last: (values: any[]) => _.last(values),
  count: (values: any[]) => values.length,
  stdDev: (values: number[]) => {
    const mean = _.mean(values);
    const variance = _.mean(values.map(v => Math.pow(v - mean, 2)));
    return Math.sqrt(variance);
  }
};

/**
 * Aggregate market data by time intervals
 * @param data Array of market data points
 * @param interval Interval string (e.g., '1s', '5m', '1h', '1d', '1w', '1M', '1y')
 * @param customAggregators Optional custom aggregation functions for additional fields
 */
export function aggregateByInterval(
  data: MarketData[],
  interval: string,
  customAggregators?: Record<string, (values: any[]) => any>
): AggregatedData[] {
  if (_.isEmpty(data)) {
    return [];
  }
  
  const config = parseInterval(interval);
  
  // Group data by interval using lodash
  const grouped = _.groupBy(data, (item) => {
    return getIntervalStart(item.date, config).toISOString();
  });
  
  // Aggregate each group
  const results = _.map(grouped, (items, intervalKey) => {
    // Sort items by date
    const sortedItems = _.sortBy(items, item => item.date.getTime());
    
    // Determine if we're working with tick data (price) or OHLC data
    const isTickData = sortedItems[0].price !== undefined;
    
    let ohlc: Partial<AggregatedData>;
    
    if (isTickData) {
      // For tick data, we need to construct OHLC from prices
      const prices = _.compact(sortedItems.map(item => item.price));
      ohlc = {
        open: _.first(prices) ?? 0,
        high: _.max(prices) ?? 0,
        low: _.min(prices) ?? 0,
        close: _.last(prices) ?? 0,
      };
    } else {
      // For pre-aggregated OHLC data, we need to aggregate properly
      ohlc = {
        open: _.first(sortedItems)?.open ?? 0,
        high: _.max(_.compact(sortedItems.map(item => item.high))) ?? 0,
        low: _.min(_.compact(sortedItems.map(item => item.low))) ?? 0,
        close: _.last(sortedItems)?.close ?? 0,
      };
    }
    
    const aggregated: AggregatedData = {
      interval: new Date(intervalKey),
      date: new Date(intervalKey),
      ...ohlc as { open: number; high: number; low: number; close: number },
      volume: _.sumBy(sortedItems, 'volume') || 0,
      count: sortedItems.length
    };
    
    // Get all unique fields across all items
    const allFields = _.uniq(_.flatMap(sortedItems, Object.keys));
    
    // Apply custom aggregators for additional fields
    const fieldsToAggregate = _.without(allFields, 'date', 'open', 'high', 'low', 'close', 'volume', 'price');
    
    _.forEach(fieldsToAggregate, (field) => {
      const values = _.compact(sortedItems.map(item => item[field]));
      if (!_.isEmpty(values)) {
        if (customAggregators?.[field]) {
          aggregated[field] = customAggregators[field](values);
        }
      }
    });
    
    return aggregated;
  });
  
  // Sort results by interval
  return _.sortBy(results, 'interval');
}

/**
 * Helper function to create common aggregation patterns
 */
export function createAggregator(
  data: MarketData[],
  interval: string,
  fieldAggregators: Record<string, keyof typeof defaultAggregators | ((values: any[]) => any)>
): AggregatedData[] {
  const aggregators = _.mapValues(fieldAggregators, (aggregator) => {
    return _.isString(aggregator) ? defaultAggregators[aggregator] : aggregator;
  });
  
  return aggregateByInterval(data, interval, aggregators);
}

// Utility function for common statistical aggregations
export function aggregateWithStats(data: MarketData[], interval: string): AggregatedData[] {
  return createAggregator(data, interval, {
    priceStdDev: (values) => defaultAggregators.stdDev(values),
    priceMean: 'mean',
    priceMedian: 'median',
    tradeCount: 'count',
    maxVolume: 'max',
    minVolume: 'min'
  });
}