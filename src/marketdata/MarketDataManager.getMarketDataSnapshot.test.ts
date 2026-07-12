import { expect } from 'chai';
import { Contract, SecType } from '@stoqey/ib';
import { MarketDataManager } from './MarketDataManager';

interface SnapshotCall {
    contract: Contract;
    genericTickList: string;
    regulatorySnapshot: boolean;
}

describe('MarketDataManager - getMarketDataSnapshot', () => {
    const buildManager = (resolvedContract: Contract | null) => {
        const manager = new MarketDataManager();
        const snapshot = { last: 5234.25 };
        const snapshotCalls: SnapshotCall[] = [];
        const contractDetailsCalls: Partial<Contract>[] = [];

        manager.ib = {
            getContractDetails: async (contract: Partial<Contract>) => {
                contractDetailsCalls.push(contract);
                if (!resolvedContract) {
                    return [];
                }

                return [{ contract: resolvedContract }];
            },
            getMarketDataSnapshot: async (contract: Contract, genericTickList: string, regulatorySnapshot: boolean) => {
                snapshotCalls.push({ contract, genericTickList, regulatorySnapshot });
                return snapshot;
            },
        } as any;

        return { manager, snapshot, snapshotCalls, contractDetailsCalls };
    };

    it('should resolve an incomplete futures contract before requesting a snapshot', async () => {
        const incompleteContract: Partial<Contract> = {
            symbol: 'ES',
            secType: SecType.FUT,
            lastTradeDateOrContractMonth: '202609',
            currency: 'USD',
        };
        const canonicalContract: Contract = {
            ...incompleteContract,
            conId: 123456789,
            exchange: 'CME',
            localSymbol: 'ESU6',
        } as Contract;
        const { manager, snapshot, snapshotCalls, contractDetailsCalls } = buildManager(canonicalContract);

        const result = await manager.getMarketDataSnapshot(incompleteContract, '233', true);

        expect(result).to.equal(snapshot);
        expect(contractDetailsCalls).to.deep.equal([incompleteContract]);
        expect(snapshotCalls).to.deep.equal([
            {
                contract: canonicalContract,
                genericTickList: '233',
                regulatorySnapshot: true,
            },
        ]);
    });

    it('should reject without requesting a snapshot when contract resolution fails', async () => {
        const incompleteContract: Partial<Contract> = {
            symbol: 'ES',
            secType: SecType.FUT,
            lastTradeDateOrContractMonth: '202609',
            currency: 'USD',
        };
        const { manager, snapshotCalls } = buildManager(null);

        try {
            await manager.getMarketDataSnapshot(incompleteContract);
            expect.fail('Expected getMarketDataSnapshot to reject');
        } catch (error) {
            expect((error as Error).message).to.contain('Unable to resolve contract for market data snapshot');
        }

        expect(snapshotCalls).to.deep.equal([]);
    });
});
