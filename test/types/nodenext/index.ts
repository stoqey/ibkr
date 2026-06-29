import { IBKRConnection, MarketDataManager, ibkr } from "../../../dist/index.js";

const connectionStatus: Promise<boolean> = ibkr();
const connection = IBKRConnection.Instance;
const marketDataManager = MarketDataManager.Instance;

void connectionStatus;
void connection;
void marketDataManager;
