import "dotenv/config";
import {IBKRConnection} from './connection';

// Export main
const ibkr = (): Promise<boolean> => {
    return IBKRConnection.Instance.init();
};

// Export all modules
export * from "./account";
export * from './connection';
export * from './events';
export * from "./marketdata";
export * from './orders';
export * from './portfolios';

// utils
export * from "./utils"

export default ibkr;
