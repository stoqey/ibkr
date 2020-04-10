import _ from 'lodash';
import isEmpty from 'lodash/isEmpty';
import { getRadomReqId } from '../_utils/text.utils';
import IBKRConnection from '../connection/IBKRConnection';
import { AppEvents, publishDataToTopic, APPEVENTS } from '../events';
import { HistoryData, SymbolWithTicker, ReqHistoricalData } from './history.interfaces';

const ib = IBKRConnection.Instance.getIBKR();
const appEvents = AppEvents.Instance;



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

      ib.cancelHistoricalData(tickerId);  // tickerId



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

      publishDataToTopic({
        topic: APPEVENTS.MARKET_DATA,
        data: dataToPublish
      });

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
    appEvents.on(APPEVENTS.GET_MARKET_DATA, ({ symbol }) => {
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

    //                   tickerId, contract,                    endDateTime, durationStr,             barSizeSetting,             whatToShow,             useRTH, formatDate, keepUpToDate
    ib.reqHistoricalData(tickerId, ib.contract.stock(...contract), endDateTime, durationStr || '1800 S', barSizeSetting || '1 secs', whatToShow || 'TRADES', 1, 1, false);

  }

  private getHistoryData(symbol: string): HistoryData[] {

    const currentData = this.historyData[symbol] || [];

    if (isEmpty(currentData)) {
      // if is empty
      // req history data
      publishDataToTopic({
        topic: APPEVENTS.GET_MARKET_DATA,
        data: {
          symbol
        }
      })

    }
    return currentData;
  }

  /**
   * getHistoricalData
   */
  public getHistoricalData(symbol: string, opt?: { timeout: number }): Promise<HistoryData[]> {

    const timeOut = opt && opt.timeout || 2000;
    let that = this;

    return new Promise((resolve, reject) => {

      const handleMarketData = ({ symbol: symbolFromEvent, marketData }: { symbol: string, marketData: HistoryData[] }) => {
        if (symbolFromEvent === symbol) {
          appEvents.removeListener(APPEVENTS.MARKET_DATA, handleMarketData);
          return resolve(marketData)
        }
      };

      // response
      appEvents.on(APPEVENTS.MARKET_DATA, handleMarketData);

      // if not found it will initiate reqHistoricalData
      that.getHistoryData(symbol);

      // timeout after 6 seconds 
      setTimeout(() => {
        handleMarketData({ symbol, marketData: [] })
      }, timeOut);

    });

  }
}

export default AccountHistoryData;