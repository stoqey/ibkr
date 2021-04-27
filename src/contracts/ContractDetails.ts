import {ContractDetails, ContractSummary, SecType} from './contracts.interfaces';
import {getRadomReqId} from '../_utils/text.utils';
import IBKRConnection from '../connection/IBKRConnection';
import {handleEventfulError} from '../events/HandleError';
import {EventName} from '@stoqey/ib';

export interface ContractDetailsParams {
    readonly conId?: number;
    readonly symbol?: string;
    readonly secType?: SecType | string;
    readonly expiry?: string;
    readonly strike?: number;
    readonly right?: string;
    readonly multiplier?: number;
    readonly exchange?: string;
    readonly currency?: string;
    readonly localSymbol?: string;
    readonly tradingClass?: string;
    readonly comboLegsDescrip?: string;
    readonly includeExpired?: any;
    readonly secIdType?: any;
    readonly secId?: any;
}

/**
 * For some reason, NASDAQ needs to be called ISLAND in the contract request field for "exchange".
 */
const exchangeMap: {readonly [exchange: string]: string} = {
    NASDAQ: 'ISLAND',
};

export function convertContractToContractDetailsParams(
    contract: Partial<ContractSummary>
): ContractDetailsParams {
    return {
        conId: contract.conId,
        symbol: contract.symbol,
        secType: contract.secType,
        expiry: contract.expiry,
        strike: contract.strike,
        right: contract.right,
        multiplier: contract.multiplier,
        exchange: (contract.exchange && exchangeMap[contract.exchange]) ?? contract.exchange,
        currency: contract.currency,
        localSymbol: contract.localSymbol,
        tradingClass: contract.tradingClass,
        comboLegsDescrip: contract.comboLegsDescrip,
        includeExpired: undefined,
        secIdType: undefined,
        secId: undefined,
    };
}

export const getContractDetails = (params: ContractDetailsParams): Promise<ContractDetails[]> => {
    const contractsLocal: ContractDetails[] = [];

    const reqId: number = getRadomReqId();

    return new Promise((resolve) => {
        const ib = IBKRConnection.Instance.getIBKR();

        const handleContract = (reqIdX, contractReceived) => {
            if (reqIdX === reqId) {
                contractsLocal.push(contractReceived);
            }
        };

        ib.on(EventName.contractDetails, handleContract);

        const contractDetailsEnd = (reqIdX: number, isError?: boolean) => {
            if (reqIdX === reqId) {
                if (isError) {
                    return resolve([]);
                }

                eventfulError(); // remove off event
                ib.off('contractDetails', handleContract);
                return resolve(contractsLocal);
            }
        };

        ib.on(EventName.contractDetailsEnd, contractDetailsEnd);

        // handleError
        const eventfulError = handleEventfulError(
            reqId,
            [
                `No security definition has been found for the request`,
                `The contract description specified is ambiguous:`,
                JSON.stringify(params),
            ],
            () => contractDetailsEnd(reqId, true)
        );

        // TODO Contract
        ib.reqContractDetails(reqId, params as any);
    });
};

export const getContractDetailsOneOrNone: (
    params: ContractDetailsParams
) => Promise<ContractDetails | undefined> = async (params) => {
    const contractDetailsList = await getContractDetails(params);
    if (contractDetailsList.length === 0) {
        return undefined;
    } else if (contractDetailsList.length === 1) {
        return contractDetailsList[0];
    } else {
        throw Error(
            'Expected zero or one results, received multiple: ' +
                JSON.stringify(contractDetailsList)
        );
    }
};

export const getContractDetailsOne: (
    params: ContractDetailsParams
) => Promise<ContractDetails> = async (params) => {
    const contractDetailsList = await getContractDetails(params);
    if (contractDetailsList.length === 0) {
        throw Error('Expected exactly one results, received none for: ' + JSON.stringify(params));
    } else if (contractDetailsList.length === 1) {
        return contractDetailsList[0];
    } else {
        throw Error(
            'Expected exactly one results, received multiple: ' +
                JSON.stringify(contractDetailsList)
        );
    }
};

export const getContractSummaryOne: (
    params: ContractDetailsParams
) => Promise<ContractSummary> = async (params) => {
    const contractDetailsList = await getContractDetails(params);
    if (contractDetailsList.length === 0) {
        throw Error('Expected exactly one results, received none for: ' + JSON.stringify(params));
    } else if (contractDetailsList.length === 1) {
        return contractDetailsList[0].summary;
    } else {
        throw Error(
            'Expected exactly one results, received multiple: ' +
                JSON.stringify(contractDetailsList)
        );
    }
};
