import {IBKREVENTS} from '../events/IBKREVENTS.const';
import IBKRConnection from './IBKRConnection';

/**
 * Async function for getting IBKR @connected event
 */
export const onConnected = (): Promise<boolean> => {
    const ibkr = IBKRConnection.app;
    ibkr.start(); // start app

    return new Promise((resolve) => {
        const func = {
            next: (value) => {
                if (value) {
                    if (value === IBKREVENTS.CONNECTED) {
                        return resolve(true);
                    }
                    return resolve(false);
                }
            },
            error: () => {
                return resolve(false);
            },
        };

        ibkr.connection.subscribe(func);
    });
};
