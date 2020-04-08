import { AppEvents } from "src/events/AppEvents";
import { APPEVENTS } from "src/events/APPEVENTS.const";

/**
 * Async function for getting IBKR @connected event
 */
export const onConnected = (): Promise<boolean> => {

    const appEvents = AppEvents.Instance;
    const eventName = APPEVENTS.CONNECT;
    // TODO check if already connected
    return new Promise((resolve, reject) => {
        const handleConnected = () => {
            appEvents.removeListener(eventName, handleConnected);
            return resolve(true);
        };
        appEvents.on(eventName, handleConnected)
    })
}