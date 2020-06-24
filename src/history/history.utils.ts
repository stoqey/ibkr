import uniqBy from 'lodash/uniqBy';
import isEmpty from 'lodash/isEmpty';
import {HistoryData} from './history.interfaces';

export const sortedMarketData = (data: HistoryData[]): HistoryData[] =>
    !isEmpty(data)
        ? uniqBy(data, 'date').sort((a, b) => {
              if (new Date(a.date) > new Date(b.date)) {
                  return 1;
              }
              return -1;
          })
        : [];
