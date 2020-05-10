
export enum IBKREVENTS {

  READY = 'READY',

  // Connections
  PING = 'ping',
  DISCONNECTED = 'disconnected',
  CONNECTED = 'connected',
  ERROR = 'error',

  /**
 * @interface IBKRAccountSummary
 */
  ON_ACCOUNT_SUMMARY = 'on_account_summary',


  // Orders portfolios, historicalData, 

  // --------------------------------------------------------------------------------------
  // --------------------------------------------ORDERS------------------------------------
  /**
   * [OrderWithContract]
   */
  OPEN_ORDERS = 'open_orders',

  /**
   * OrderStock
   */
  PLACE_ORDER = 'place_order',

  /**
   * { orderStatus: OrderStatus, order: OrderWithContract }
  */
  ORDER_STATUS = 'order_status',

  /**
   * { sale: CreateSale, order: OrderWithContract }
   */
  ORDER_FILLED = 'order_filled',

  CREATE_SALE = 'create_sale',

  // --------------------------------------------------------------------------------------
  // ---------------------------------------------PORTFOLIOS-------------------------------

  /**
   * [PortFolioUpdate]
   */
  PORTFOLIOS = 'portfolios',

  // --------------------------------------------------------------------------------------
  // ---------------------------------------------MARKETDATA-------------------------------


  /**
   * @interface SymbolWithMarketData 
   * {    symbol: string,
          marketData: HistoryData[]
     }
   */
  ON_MARKET_DATA = 'on_market_data',

  GET_MARKET_DATA = 'get_market_data',


  /**
   * { symbol, tickType?: 'ASK' | 'BID' | 'CLOSE' }
   */
  SUBSCRIBE_PRICE_UPDATES = 'subscribe_price_updates',

  /**
   * { symbol: string; date: Date; close: number; }
   */
  ON_PRICE_UPDATES = 'subscribe_price_updates',





}