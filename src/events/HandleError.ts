import { IBKRConnection } from "../connection";
import isEmpty from "lodash/isEmpty";
import { verbose } from "../log";

/**
 * Assuming IBKR returns predictable errors
 * Check if errors thrown match the targetError,
 * @param targetErrors - target strings,
 * @param catchError - function to stop/tell caller that targetErrors where matched
 * 
 * @returns () => void // remove listener function
 * @important always call the returned function to remove listeners and avoid memory leaks
 */
export function handleEventfulError(targetErrors: string[], catchError: Function): () => void {

    if (isEmpty(targetErrors)) {
        return () => { };
    };

    // convert all targeted errors to lowercase
    targetErrors = targetErrors.map(er => (er || "").toLowerCase());

    const ib = IBKRConnection.Instance.getIBKR();

    const handleError = (error) => {
        // message to lower case
        const errorMessage = (error && error.message || "").toLowerCase();

        const isError = targetErrors.some(tError => errorMessage.includes(tError));

        if (isError) {
            verbose('handleEventfulError > handleError.errorMessage', errorMessage);
            catchError();
        }
    };

    ib.on('error', handleError);

    // return remover 
    return () => {
        ib.off('error', handleError);
    }
}