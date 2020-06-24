import {ContractDetails} from './contracts.interfaces';
import {getRadomReqId} from '../_utils/text.utils';
import IBKRConnection from '../connection/IBKRConnection';

export const getContractDetails = (
    contract: string | any
): Promise<ContractDetails | ContractDetails[]> => {
    let contractArg: any = contract;
    const contractsLocal: ContractDetails[] = [] as any;

    const reqId: number = getRadomReqId();

    return new Promise((resolve) => {
        const ib = IBKRConnection.Instance.getIBKR();

        // If string, create stock contract as default

        if (typeof contractArg === 'string') {
            contractArg = ib.contract.stock(contractArg);
        }

        const handleContract = (reqId, contractReceived) => {
            contractsLocal.push(contractReceived);
        };

        ib.on('contractDetails', handleContract);

        ib.once('contractDetailsEnd', (reqIdX) => {
            if (reqId === reqIdX) {
                ib.off('contractDetails', handleContract);
                if (typeof contract === 'string') {
                    return resolve(contractsLocal[0]);
                }
                resolve(contractsLocal);
            }
        });

        ib.reqContractDetails(reqId, contractArg);
    });
};
