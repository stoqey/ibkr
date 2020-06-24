import {IbkrEvents} from '../events/IbkrEvents';
import {IBKREVENTS} from '../events/IBKREVENTS.const';
import IBKRConnection from './IBKRConnection';

/**
 * Async function for getting IBKR @connected event
 */
export const onConnected = (): Promise<boolean> => {
    const appEvents = IbkrEvents.Instance;
    const ibkr = IBKRConnection.Instance;

    return new Promise((resolve, reject) => {
        if (ibkr.status === IBKREVENTS.CONNECTED) {
            return resolve(true);
        }

        const handleConnected = () => {
            removeListners();
            resolve(true);
        };

        const handleDisconnect = () => {
            removeListners();
            resolve(false);
        };

        const removeListners = () => {
            appEvents.off(IBKREVENTS.CONNECTED, handleConnected);
            appEvents.off(IBKREVENTS.DISCONNECTED, handleDisconnect);
        };

        appEvents.on(IBKREVENTS.CONNECTED, handleConnected);
        appEvents.on(IBKREVENTS.DISCONNECTED, handleDisconnect);

        // ping
        appEvents.emit(IBKREVENTS.PING, {});
    });
};
