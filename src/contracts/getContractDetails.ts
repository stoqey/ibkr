import _ from 'lodash';
import IbConnection from "../ibConnection";
import { getRadomReqId } from '../utils/text.utils';
import { ContractDetails, ContractObject } from '../contract/interface.contract';


interface ContactWithCost extends ContractObject {
    pos?: number;
    avgCost?: number;
}

interface Contacts {
    [x: string]: ContactWithCost
};


export const getContractDetails = (symbol: string): Promise<ContractDetails.RootObject> => {

    let contract: ContractDetails.RootObject = {} as any;



    let reqId: number = getRadomReqId();

    return new Promise(
        (resolve, reject) => {

            const ib = IbConnection.Instance.getIBKR();

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

            ib.reqContractDetails(reqId, contractArg)
        }

    )

}