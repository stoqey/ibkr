import { onConnected } from './connection';

// Export main
const ibkr = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        async function runIbkrApp() {
            const connection = await onConnected();
            if (connection) {
                return resolve(true)
            }
            reject('Failed to connect IBKR, please try again')
        }

        runIbkrApp();
    });
}

// Export all modules
export * from './account';
export * from './connection';
export * from './contracts';
export * from './events';
export * from './history';
export * from './orders';
export * from './portfolios';
export * from './realtime';

export default ibkr;