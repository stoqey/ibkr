import {ContractDetails} from './contracts.interfaces';
import {getRadomReqId} from '../_utils/text.utils';
import IBKRConnection from '../connection/IBKRConnection';
import {handleEventfulError} from '../events/HandleError';

export const getContractDetails = (
    contract: string | any
): Promise<ContractDetails | ContractDetails[]> => {
    let contractArg: any = contract;
    const contractsLocal: ContractDetails[] = [] as any;

    const reqId: number = getRadomReqId();

    return new Promise((resolve) => {
        const ib = IBKRConnection.Instance.getIBKR();

        // If string, create stock contract as default
        let symbol = contractArg && contractArg.symbol;

        if (typeof contractArg === 'string') {
            symbol = contractArg;
            contractArg = ib.contract.stock(contractArg);
        }

        const handleContract = (reqId, contractReceived) => {
            contractsLocal.push(contractReceived);
        };

        ib.on('contractDetails', handleContract);

        const contractDetailsEnd = (reqIdX: number, isError?: boolean) => {
            if (isError) {
                return resolve(null);
            }

            if (reqId === reqIdX) {
                eventfulError(); // remove off event
                ib.off('contractDetails', handleContract);

                if (typeof contract === 'string') {
                    return resolve(contractsLocal[0]);
                }
                resolve(contractsLocal);
            }
        };

        ib.on('contractDetailsEnd', contractDetailsEnd);

        // handleError
        const eventfulError = handleEventfulError(
            reqId,
            [
                `No security definition has been found for the request`,
                `The contract description specified for ${symbol} is ambiguous.`,
            ],
            () => contractDetailsEnd(reqId, true)
        );

        ib.reqContractDetails(reqId, contractArg);
    });
};
