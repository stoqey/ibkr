import { AppEvents } from "src/events/AppEvents";
import { APPEVENTS } from "src/events/APPEVENTS.const";
import IBKRConnection from "./IBKRConnection";

/**
 * Async function for getting IBKR @connected event
 */
export const onConnected = (): Promise<boolean> => {

    const appEvents = AppEvents.Instance;
    const ibkr = IBKRConnection.Instance;

    const eventName = APPEVENTS.CONNECTED;

    return new Promise((resolve, reject) => {

        if(ibkr.status === APPEVENTS.CONNECTED){
            resolve(true);
        }

        const handleConnected = () => {
            appEvents.removeListener(eventName, handleConnected);
            return resolve(true);
        };

        appEvents.on(eventName, handleConnected)
    })
}