import { AppEvents } from "../events/AppEvents";
import { APPEVENTS } from "../events/APPEVENTS.const";
import IBKRConnection from "./IBKRConnection";

/**
 * Async function for getting IBKR @connected event
 */
export const onConnected = (): Promise<boolean> => {

    const appEvents = AppEvents.Instance;
    const ibkr = IBKRConnection.Instance;

    return new Promise((resolve, reject) => {

        if(ibkr.status === APPEVENTS.CONNECTED){
            return resolve(true);
        }

        const handleConnected = () => {
            removeListners();
            resolve(true);
        };

        const handleDisconnect = () => {
            removeListners();
            resolve(false)
        };

        const removeListners = () => {
            appEvents.removeListener(APPEVENTS.CONNECTED, handleConnected);
            appEvents.removeListener(APPEVENTS.DISCONNECTED, handleDisconnect);
        }

        appEvents.on(APPEVENTS.CONNECTED, handleConnected)
        appEvents.on(APPEVENTS.DISCONNECTED, handleDisconnect)
    })
}