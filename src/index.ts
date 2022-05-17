import {IBKRConnection, IbkrInitOpt, onConnected} from './connection';

interface IBKR {
    host?: string; // or using process.env.IB_HOST
    port?: number; // or using process.env.IB_PORT
    opt?: Partial<IbkrInitOpt>;
}
// Export main
const ibkr = (args?: Partial<IBKR>): Promise<boolean> => {
    // Default from these envs
    const {IB_PORT = 4003, IB_HOST = 'localhost'} = process.env || {};

    const {host = IB_HOST, port = IB_PORT, opt} = args || {};

    IBKRConnection.Instance.init(host, +port, opt);

    return new Promise((resolve, reject) => {
        async function runIbkrApp() {
            const connection = await onConnected();
            if (connection) {
                return resolve(true);
            }
            reject('Failed to connect IBKR, please try again');
        }

        runIbkrApp();
    });
};

// Export all modules
export * from './account';
export * from './connection';
export * from './contracts';
export * from './events';
export * from './fundamental';
export * from './history';
export * from './orders';
export * from './portfolios';
export * from './realtime';
export * from './scanner';

export default ibkr;
