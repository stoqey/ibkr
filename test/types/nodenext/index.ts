import { IBKRConnection, MarketDataManager, ibkr } from "@stoqey/ibkr";
import { AccountSummary } from "@stoqey/ibkr/account";
import { normalizeReconnectInterval } from "@stoqey/ibkr/connection";
import { IBKREVENTS, IBKREvents } from "@stoqey/ibkr/events";
import { OrderAction, type Instrument } from "@stoqey/ibkr/interfaces";
import { aggregateTicksBySeconds } from "@stoqey/ibkr/marketdata";
import { Orders } from "@stoqey/ibkr/orders";
import { Portfolios } from "@stoqey/ibkr/portfolios";
import { formatDateStr, getSymbolKey } from "@stoqey/ibkr/utils";
import { log } from "@stoqey/ibkr/utils/log";

const connectionStatus: Promise<boolean> = ibkr();
const connection = IBKRConnection.Instance;
const marketDataManager = MarketDataManager.Instance;
const accountSummary = AccountSummary.Instance;
const events = IBKREvents.Instance;
const orders = Orders.Instance;
const portfolios = Portfolios.Instance;
const reconnectInterval: number = normalizeReconnectInterval(0);
const instrument: Instrument = {
  symbol: "AAPL",
  exchange: "SMART",
};
const symbol: string = getSymbolKey(instrument);
const timestamp: string = formatDateStr(new Date());
const action: OrderAction = OrderAction.BUY;
const eventName: IBKREVENTS = IBKREVENTS.IBKR_CONNECTED;
const ticks = aggregateTicksBySeconds([]);

void connectionStatus;
void connection;
void marketDataManager;
void accountSummary;
void events;
void orders;
void portfolios;
void reconnectInterval;
void symbol;
void timestamp;
void action;
void eventName;
void ticks;
void log;
