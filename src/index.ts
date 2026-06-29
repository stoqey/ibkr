import "dotenv/config";
import { IBApiNextCreationOptions } from '@stoqey/ib';
import {IBKRConnection} from './connection';

// Export main
export const ibkr = (opt?: Partial<IBApiNextCreationOptions>): Promise<boolean> => {
    return IBKRConnection.Instance.init(opt);
};

// Export all modules
export * from "./account";
export * from './connection';
export * from './events';
export * from "./marketdata";
export * from './orders';
export * from './portfolios';

// utils
export * from "./interfaces";
export * from "./utils"

export default ibkr;
