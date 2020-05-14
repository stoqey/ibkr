
import includes from 'lodash/includes';
import reverse from 'lodash/reverse';
import moment from 'moment';
import isEmpty from 'lodash/isEmpty';
import { getRadomReqId } from '../_utils/text.utils';
import IBKRConnection from '../connection/IBKRConnection';
import { IbkrEvents, publishDataToTopic, IBKREVENTS } from '../events';
import { HistoryData, SymbolWithTicker, ReqHistoricalData, SymbolWithMarketData, WhatToShow, BarSizeSetting } from './history.interfaces';


const appEvents = IbkrEvents.Instance;

interface GetMarketData {
  symbol: string;
  contract?: any[],
  endDateTime?: string;
  durationStr?: string;
  barSizeSetting?: BarSizeSetting;
  whatToShow?: WhatToShow;
}

export class HistoricalData {

  ib: any;
  historyData: { [x: string]: HistoryData[] } = {};
  historyDataDump: { [x: string]: { data: any[] } } = {};

  symbolsWithTicker: { tickerId: number, symbol: string }[] = []

  private static _instance: HistoricalData;

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  private constructor() {

    let that = this;

    const ib = IBKRConnection.Instance.getIBKR();
    this.ib = ib;

    const endhistoricalData = (tickerId) => {

      ib.cancelHistoricalData(tickerId);  // tickerId



      const currentSymbol = this.symbolsWithTicker.find(y => y.tickerId === tickerId);

      if (isEmpty(currentSymbol)) {
        return null;
      }

      const collectedData = reverse(this.historyDataDump[tickerId] && this.historyDataDump[tickerId].data || []);

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
        topic: IBKREVENTS.ON_MARKET_DATA,
        data: dataToPublish
      });

      delete this.historyDataDump[tickerId];
    }

    ib.on('historicalData', (reqId, date, open, high, low, close, volume, barCount, WAP, hasGaps) => {

      if (includes([-1], open)) {
        endhistoricalData(reqId);
      } else {

        const currentSymbol = this.symbolsWithTicker.find(y => y.tickerId === reqId);

        const dateFormat = "YYYYMMDD hh:mm:ss";

        const newEntry: HistoryData = {
          reqId, date: moment(date, dateFormat).toDate(), open, high, low, close, volume, barCount, WAP, hasGaps
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
    appEvents.on(IBKREVENTS.GET_MARKET_DATA, (args: GetMarketData) => {
      // request History Data

      const {
        symbol,
        contract = [symbol, 'SMART', 'USD'],
        endDateTime = '',
        durationStr = '1 D',
        barSizeSetting = '1 min',
        whatToShow = 'ASK'
      } = args;

      console.log(`on history data ${symbol}`)

      if (isEmpty(symbol)) {
        return;
      }



      that.reqHistoryData({
        symbol,
        tickerId: getRadomReqId(),
      }, {
        contract,
        endDateTime,
        durationStr,
        barSizeSetting,
        whatToShow
      });


    })



  }

  private reqHistoryData = (args: SymbolWithTicker, params: ReqHistoricalData): void => {

    const {
      tickerId,
      symbol
    } = args;

    console.log(`HistoricalData.reqHistoryData`, `Request historyData ${symbol}`)

    // Save this symbol in this class
    this.symbolsWithTicker.push(args);

    const {
      contract,
      endDateTime,
      durationStr,
      barSizeSetting,
      whatToShow } = params;

    //                   tickerId, contract,                    endDateTime, durationStr,             barSizeSetting,             whatToShow,             useRTH, formatDate, keepUpToDate
    this.ib.reqHistoricalData(tickerId, this.ib.contract.stock(...contract), endDateTime, durationStr || '1800 S', barSizeSetting || '1 secs', whatToShow || 'TRADES', 1, 1, false);

  }

  public getHistoricalData = (args: GetMarketData): void => {
    publishDataToTopic({
      topic: IBKREVENTS.GET_MARKET_DATA,
      data: args
    });

  }

}

export default HistoricalData;