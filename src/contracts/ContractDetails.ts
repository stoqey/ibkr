import _ from 'lodash';
import { ContractDetails, ContractObject } from './contracts.interfaces';
import { getRadomReqId } from '../_utils/text.utils';
import IBKRConnection from '../connection/IBKRConnection';


interface ContactWithCost extends ContractObject {
    pos?: number;
    avgCost?: number;
}

interface Contacts {
    [x: string]: ContactWithCost
};


export const getContractDetails = (symbol: string): Promise<ContractDetails> => {

    let contract: ContractDetails = {} as any;



    let reqId: number = getRadomReqId();

    return new Promise(
        (resolve, reject) => {

            const ib = IBKRConnection.Instance.getIBKR();

            const contractArg = ib.contract.stock(symbol);

            ib.on('contractDetails', (reqIdX, contract) => {
                reqId = reqIdX;
                contract = contract;

                console.log('Contract details', JSON.stringify(contract))
            })

            ib.on('contractDetailsEnd', (reqId) => {
                console.log('Contract details end')
                resolve(contract)
            })

            ib.reqContractDetails(reqId, contractArg);
        }

    )

}