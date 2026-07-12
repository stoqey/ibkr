import { expect } from 'chai';
import { Contract, SecType } from '@stoqey/ib';
import { MarketDataManager } from './MarketDataManager';

interface SnapshotCall {
    contract: Contract;
    genericTickList: string;
    regulatorySnapshot: boolean;
}

describe('MarketDataManager - getMarketDataSnapshot', () => {
    const originalContracts = process.env.IBKR_CONTRACTS;
    const originalMarketDataContracts = process.env.IBKR_CONTRACTS_MARKETDATA;
    const originalMarketDataContractsAlias = process.env.IBKR_CONTRACTS_MD;

    beforeEach(() => {
        delete process.env.IBKR_CONTRACTS;
        delete process.env.IBKR_CONTRACTS_MARKETDATA;
        delete process.env.IBKR_CONTRACTS_MD;
    });

    after(() => {
        if (originalContracts === undefined) {
            delete process.env.IBKR_CONTRACTS;
        } else {
            process.env.IBKR_CONTRACTS = originalContracts;
        }
        if (originalMarketDataContracts === undefined) {
            delete process.env.IBKR_CONTRACTS_MARKETDATA;
        } else {
            process.env.IBKR_CONTRACTS_MARKETDATA = originalMarketDataContracts;
        }
        if (originalMarketDataContractsAlias === undefined) {
            delete process.env.IBKR_CONTRACTS_MD;
        } else {
            process.env.IBKR_CONTRACTS_MD = originalMarketDataContractsAlias;
        }
    });

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

    it('should resolve the top-level query when input contains a nested contract', async () => {
        // Arrange
        const query: Partial<Contract> = {
            symbol: 'ES',
            secType: SecType.FUT,
            lastTradeDateOrContractMonth: '202609',
            currency: 'USD',
        };
        const canonicalContract: Contract = {
            ...query,
            conId: 123456789,
            exchange: 'CME',
            localSymbol: 'ESU6',
        } as Contract;
        const decoyContract: Contract = {
            symbol: 'NQ',
            secType: SecType.FUT,
            conId: 987654321,
            exchange: 'CME',
            localSymbol: 'NQU6',
        } as Contract;
        const contractWithNestedContract = { ...query, contract: decoyContract } as Partial<Contract> & { contract?: unknown };
        const { manager, snapshotCalls, contractDetailsCalls } = buildManager(canonicalContract);

        // Act
        await manager.getMarketDataSnapshot(contractWithNestedContract);

        // Assert
        expect(contractDetailsCalls).to.deep.equal([query]);
        expect(snapshotCalls).to.deep.equal([
            {
                contract: canonicalContract,
                genericTickList: '',
                regulatorySnapshot: false,
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

    it('should reject without requesting a snapshot when the resolved contract is filtered', async () => {
        // Arrange
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
        process.env.IBKR_CONTRACTS_MARKETDATA = 'NQ-FUT';
        const { manager, snapshotCalls, contractDetailsCalls } = buildManager(canonicalContract);

        // Act
        try {
            await manager.getMarketDataSnapshot(incompleteContract);
            expect.fail('Expected getMarketDataSnapshot to reject');
        } catch (error) {
            expect((error as Error).message).to.contain('Contract ES-FUT-202609 filtered by IBKR contract filter=NQ-FUT');
        }

        // Assert
        expect(contractDetailsCalls).to.deep.equal([incompleteContract]);
        expect(snapshotCalls).to.deep.equal([]);
    });
});
