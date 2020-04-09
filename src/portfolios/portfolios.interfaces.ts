import { ContractObject } from '../contracts/contracts.interfaces';

/**
 * A.K.A Contract with it's position
 */
export interface PortFolioUpdate {
    contract?: ContractObject;
    position?: number; // 100,
    marketPrice?: number; // 40.33366015,
    marketValue?: number; // 4033.37,
    averageCost?: number; // 36.68,
    unrealizedPNL?: number; // 365.37,
    realizedPNL?: number; // 4279.43,
    accountName?: number; // "DU1731307"
};