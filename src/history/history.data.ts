import _ from 'lodash';
import IbConnection from "../../ibConnection";
import { getRadomReqId } from '../../utils/text.utils';
import isEmpty from 'lodash/isEmpty';
import { publishDataToTopic } from '../../servers/MQ.Publishers';
import { AppEvents } from '../../servers/app.EventEmitter';
// import { getArgs } from '../../utils/script.utils';

const ib = IbConnection.Instance.getIBKR();
const appEvents = AppEvents.Instance;

enum WhatToShow {
  ADJUSTED_LAST,
  TRADES, MIDPOINT, BID, ASK, // << only these are valid for real-time bars
  BID_ASK, HISTORICAL_VOLATILITY, OPTION_IMPLIED_VOLATILITY, YIELD_ASK, YIELD_BID, YIELD_BID_ASK, YIELD_LAST
}

type BarSizeSetting = "1 secs" | "5 secs" | "10 secs" | "15 secs" | "30 secs" | "1 min" | "2 mins" | "3 mins" | "5 mins" | "10 mins" | "15 mins" | "20 mins" | "30 mins" | "1 hour" | "2 hours" | "3 hours" | "4 hours" | "8 hours" | "1 day" | "1W" | "1M";
export interface HistoryData {
  reqId?: number;
  date?: string; // "20190308  11:59:56"
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
  barCount?: number;
  WAP?: number;
  hasGaps?: boolean;
}

interface ReqHistoricalData {
  contract: string[], // 'IFRX', 'SMART', 'USD',
  endDateTime: string; // '20190308 12:00:00',
  durationStr: string; // '1800 S'
  barSizeSetting: BarSizeSetting; // '1 secs'
  whatToShow?: keyof typeof WhatToShow; // 'TRADES'
  useRTH?: any;
  formatDate?: number;
  keepUpToDate?: boolean;
}

interface SymbolWithTicker {
  tickerId: number,
  symbol: string;
}


class AccountHistoryData {

  historyData: { [x: string]: HistoryData[] } = {};
  historyDataDump: { [x: string]: { data: any[] } } = {};

  symbolsWithTicker: { tickerId: number, symbol: string }[] = []

  private static _instance: AccountHistoryData;

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  private constructor() {

    let that = this;
    const endhistoricalData = (tickerId) => {

      setTimeout(() => {
        ib.cancelHistoricalData(tickerId);  // tickerId
      }, 1000);


      const currentSymbol = this.symbolsWithTicker.find(y => y.tickerId === tickerId);

      if (isEmpty(currentSymbol)) {
        return null;
      }

      const collectedData = this.historyDataDump[tickerId] && this.historyDataDump[tickerId].data || [];

      this.historyData = {
        ...this.historyData,
        [currentSymbol.symbol]: collectedData
      };

      // Publish data to Random Generator
      const dataToPublish: {
        symbol: string;
        marketData: any[];
      } = {
        symbol: currentSymbol.symbol,
        marketData: collectedData,
      };


      // TODO PUBLISH TO THE CLOUD
      publishDataToTopic({
        topic: 'marketData',
        data: dataToPublish
      });

      // if (commandLineArgs && commandLineArgs.skipAI) {
      //   console.log(chalk.magenta(`SKIP: SCANNER AI ${commandLineArgs.skipAI}`))
      //   publishDataToTopic({
      //     topic: 'highestAI',
      //     data: dataToPublish
      //   })
      // }
      // else {
      //   console.log(`AccountHistoryData.endhistoricalData`, chalk.magenta(`TO: SCANNER AI ${currentSymbol.symbol}`))
      //   publishDataToTopic({
      //     topic: 'scannerAI',
      //     data: dataToPublish
      //   })

      // }


      delete this.historyDataDump[tickerId];
    }

    ib.on('historicalData', (reqId, date, open, high, low, close, volume, barCount, WAP, hasGaps) => {

      if (_.includes([-1], open)) {
        endhistoricalData(reqId);
      } else {

        const currentSymbol = this.symbolsWithTicker.find(y => y.tickerId === reqId);

        const newEntry = {
          reqId, date, open, high, low, close, volume, barCount, WAP, hasGaps
        };

        if (!isEmpty(currentSymbol)) {

          // Save into dumpData
          this.historyDataDump = {
            ...this.historyDataDump,
            [reqId]: {
              ...(this.historyDataDump[reqId] || null),
              data: [...(this.historyDataDump[reqId] && this.historyDataDump[reqId].data || []), newEntry]
            }
          }
        }
      }
    });

    // listen for any historicalData event
    appEvents.on('historicalData', ({ symbol }) => {
      // request History Data

      console.log(`on history data ${symbol}`)

      if (isEmpty(symbol)) {
        return;
      }


      that.reqHistoryData({
        symbol,
        tickerId: getRadomReqId(),
      }, {
        contract: [symbol, 'SMART', 'USD'],
        endDateTime: '',
        durationStr: '4 D',
        barSizeSetting: '1 min',
        whatToShow: 'ASK'
      });


    })



  }

  private reqHistoryData(args: SymbolWithTicker, params: ReqHistoricalData): void {


    const {
      tickerId,
      symbol
    } = args;

    console.log(`AccountHistoryData.reqHistoryData`, `Request historyData ${symbol}`)

    // Save this symbol in this class
    this.symbolsWithTicker.push(args);

    const {
      contract,
      endDateTime,
      durationStr,
      barSizeSetting,
      whatToShow } = params;

    setTimeout(() => {
      //                   tickerId, contract,                    endDateTime, durationStr,             barSizeSetting,             whatToShow,             useRTH, formatDate, keepUpToDate
      ib.reqHistoricalData(tickerId, ib.contract.stock(...contract), endDateTime, durationStr || '1800 S', barSizeSetting || '1 secs', whatToShow || 'TRADES', 1, 1, false);
    }, 1000)

    // return this.getHistoryData(symbol);

  }

  public getHistoryData(symbol: string): HistoryData[] {

    const currentData = this.historyData[symbol] || [];

    if (isEmpty(currentData)) {
      // if is empty
      // req history data
      publishDataToTopic({
        topic: 'historicalData',
        data: {
          symbol
        }
      })

    }
    return currentData;
  }

  /**
   * getHistoricalDataSync
   */
  public getHistoricalDataSync(symbol: string): Promise<HistoryData[]> {

    let that = this;
    const eventName = 'marketData';

    return new Promise((resolve, reject) => {


      const handleMarketData = ({ symbol: symbolFromEvent, marketData }: { symbol: string, marketData: HistoryData[]}) => {
        if(symbolFromEvent === symbol){
          appEvents.removeListener(eventName, handleMarketData);
          return resolve(marketData)
        }
      };

      // response
      appEvents.on(eventName, handleMarketData);

      // if not found it will initiate reqHistoricalData
      const histData = that.getHistoryData(symbol);

      if(!isEmpty(histData)){
        return resolve(histData);
      }

      // timeout after 6 seconds 
      setTimeout(() => {
        handleMarketData({ symbol, marketData: []})
      }, 6000);

    });
    
  }
}

export default AccountHistoryData;