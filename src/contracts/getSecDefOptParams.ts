import {IBKRConnection} from '../connection';
import {log} from '../log';
import {getRadomReqId} from '../_utils/text.utils';
import {SecType} from './contracts.interfaces';

export interface SecDefOptContractParams {
    readonly conId: number;
    readonly secType: SecType | string;
    readonly symbol: string;
    readonly futFopExchange?: string;
}

export interface SecDefOptData {
    /** The exchange for the option */
    readonly exchange: string;
    /** Underlying conId */
    readonly underlyingConId: number;
    /** Underlying symbol */
    readonly tradingClass: string;
    /** The multiplier as a string, typically "100" */
    readonly multiplier: string;
    /** List of expiration dates in YYYYMMDD format */
    readonly expirations: readonly string[];
    /** List of strike prices */
    readonly strikes: readonly number[];
}

export function getSecDefOptParams(
    contract: SecDefOptContractParams
): Promise<readonly SecDefOptData[]> {
    const ib = IBKRConnection.Instance.getIBKR();

    const datas: SecDefOptData[] = [];

    const reqIdSelected = getRadomReqId();

    let resolver: undefined | ((value: readonly SecDefOptData[]) => void);

    const dataHandler = (
        reqId: number,
        exchange: string,
        underlyingConId: number,
        tradingClass: string,
        multiplier: string,
        expirations: readonly string[],
        strikes: readonly number[]
    ) => {
        if (reqId === reqIdSelected) {
            const data: SecDefOptData = {
                exchange,
                underlyingConId,
                tradingClass,
                multiplier,
                expirations,
                strikes,
            };

            log('onSecDefOptParams:', reqId, data);

            datas.push(data);
        }
    };

    const endHandler = (reqId: number) => {
        if (reqId === reqIdSelected) {
            log('onSecDefOptParamsEnd:', reqId);
            ib.off('securityDefinitionOptionParameter', dataHandler);
            ib.off('securityDefinitionOptionParameterEnd', endHandler);
            resolver?.(datas);
        }
    };

    ib.on('securityDefinitionOptionParameter', dataHandler);
    ib.on('securityDefinitionOptionParameterEnd', endHandler);
    ib.reqSecDefOptParams(
        reqIdSelected,
        contract.symbol,
        contract.futFopExchange ?? '',
        contract.secType,
        contract.conId
    );

    return new Promise<readonly SecDefOptData[]>((res) => {
        resolver = res;
    });
}
