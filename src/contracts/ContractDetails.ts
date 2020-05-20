import ibkr from '@stoqey/ib';
import { ContractDetails } from './contracts.interfaces';
import { getRadomReqId } from '../_utils/text.utils';
import IBKRConnection from '../connection/IBKRConnection';
import { log } from '../log';

export const getContractDetails = (contractArg: any): Promise<ContractDetails[]> => {


    let contract: ContractDetails[] = [] as any;

    let reqId: number = getRadomReqId();

    return new Promise(
        (resolve, reject) => {

            const ib = IBKRConnection.Instance.getIBKR();

            // If string, create stock contract as default

            if (typeof contractArg === "string") {
                contractArg = ib.contract.stock(contractArg);
            };

            const handleContract = (reqId, contractReceived) => {
                contract.push(contractReceived);
            };

            ib.on('contractDetails', handleContract)

            ib.once('contractDetailsEnd', (reqIdX) => {
                if (reqId === reqIdX) {
                    ib.off('contractDetails', handleContract);
                    resolve(contract);
                }
            })

            ib.reqContractDetails(reqId, contractArg);
        }

    )

}