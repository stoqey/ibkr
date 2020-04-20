
export enum IBKREVENTS {

  READY = 'READY',

  // Connections
  PING = 'ping',
  DISCONNECTED = 'disconnected',
  CONNECTED = 'connected',
  ERROR = 'error',


  // Orders portfolios, historicalData, 
  ORDER = 'order',
  GET_OPEN_ORDERS = 'get_open_orders',
  SAVE_ORDER = 'save_order',

  PLACE_ORDER = 'place_order',

  CREATE_SALE = 'create_sale',

  PORTFOLIOS = 'portfolios',

  /**
   * @interface IBKRAccountSummary
   */
  ON_ACCOUNT_SUMMARY = 'on_account_summary',

  /**
   * @interface SymbolWithMarketData 
   * {    symbol: string,
          marketData: HistoryData[]
     }
   */
  ON_MARKET_DATA = 'on_market_data',

  GET_MARKET_DATA = 'get_market_data',





}