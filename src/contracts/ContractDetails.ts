import { ContractDetails } from './contracts.interfaces';
import { getRadomReqId } from '../_utils/text.utils';
import IBKRConnection from '../connection/IBKRConnection';
import { log } from '../log';

export const getContractDetails = (symbol: string): Promise<ContractDetails> => {

    let contract: ContractDetails = {} as any;

    let reqId: number = getRadomReqId();

    return new Promise(
        (resolve, reject) => {

            const ib = IBKRConnection.Instance.getIBKR();

            const contractArg = ib.contract.stock(symbol);

            const handleContract = (reqId, contractReceived) => {
                contract = contractReceived;
            };

            ib.on('contractDetails', handleContract)

            ib.once('contractDetailsEnd', (reqId) => {
                const currentSymbol = contract && contract.summary && contract.summary.symbol;
                if (currentSymbol === symbol) {
                    ib.off('contractDetails', handleContract);
                    log('Contract details', currentSymbol);
                    resolve(contract);
                }
            })

            ib.reqContractDetails(reqId, contractArg);
        }

    )

}