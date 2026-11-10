import { expect } from 'chai';
import { Contract, SecType } from '@stoqey/ib';
import { MarketDataManager } from './MarketDataManager';

describe('MarketDataManager - contract queries', () => {
    const buildManager = (details: any[] = [], error?: Error) => {
        const manager = new MarketDataManager();
        const calls: Partial<Contract>[] = [];
        manager.ib = {
            getContractDetails: async (query: Partial<Contract>) => {
                calls.push(query);
                if (error) {
                    throw error;
                }
                return details;
            },
        } as any;
        return { manager, calls };
    };

    const savedContract = (): Contract => ({
        conId: 462941472,
        symbol: 'GC',
        secType: SecType.FUT,
        exchange: 'COMEX',
        currency: 'USD',
        lastTradeDateOrContractMonth: '20261229 13:30:00 US/Eastern',
        localSymbol: 'GCZ6',
        tradingClass: 'GC',
        multiplier: 100,
    });

    for (const method of ['getContract', 'searchContracts'] as const) {
        describe(method, () => {
            it('should query by identity when a saved contract has a positive conId', async () => {
                const { manager, calls } = buildManager();
                const query = Object.freeze(savedContract());

                await manager[method](query);

                expect(calls).to.deep.equal([{ conId: query.conId, exchange: 'COMEX' }]);
                expect(query.lastTradeDateOrContractMonth).to.equal('20261229 13:30:00 US/Eastern');
            });

            for (const includeExpired of [true, false]) {
                it(`should preserve includeExpired=${includeExpired} when querying a known contract`, async () => {
                    const { manager, calls } = buildManager();
                    const query = { ...savedContract(), includeExpired };

                    await manager[method](query);

                    expect(calls).to.deep.equal([{ conId: query.conId, exchange: 'COMEX', includeExpired }]);
                });
            }

            it('should omit optional identity fields when only conId is supplied', async () => {
                const { manager, calls } = buildManager();

                await manager[method]({ conId: 462941472 });

                expect(calls).to.deep.equal([{ conId: 462941472 }]);
            });

            for (const expiry of ['20261229 13:30:00 US/Eastern', '20261229 13:30:00']) {
                it(`should normalize expiry ${expiry} when searching without a known conId`, async () => {
                    const { manager, calls } = buildManager();
                    const query = Object.freeze({
                        ...savedContract(), conId: 0, lastTradeDateOrContractMonth: expiry,
                        includeExpired: true, strike: 100, right: 'C',
                    });

                    await manager[method](query);

                    expect(calls).to.deep.equal([{ ...query, lastTradeDateOrContractMonth: '20261229' }]);
                    expect(query.lastTradeDateOrContractMonth).to.equal(expiry);
                });
            }

            for (const expiry of ['202612', '20261229', '', undefined, '20261229invalid']) {
                it(`should preserve expiry ${String(expiry)} when it is not a recognized timestamp`, async () => {
                    const { manager, calls } = buildManager();
                    const query = { symbol: 'GC', secType: SecType.FUT, lastTradeDateOrContractMonth: expiry };

                    await manager[method](query);

                    expect(calls).to.deep.equal([query]);
                    expect(calls[0]).not.to.equal(query);
                });
            }

            it('should preserve symbol filters when a broad search omits expiry', async () => {
                const { manager, calls } = buildManager();
                const query = { symbol: 'GC', secType: SecType.FUT, exchange: 'COMEX', currency: 'USD' };

                await manager[method](query);

                expect(calls).to.deep.equal([query]);
            });

            it('should preserve returned metadata when Gateway returns contract details', async () => {
                const contract = savedContract();
                const details = { contract, minTick: 0.1, longName: 'Gold' };
                const { manager } = buildManager([details]);

                const result = await manager[method](contract);
                const resolved = method === 'getContract' ? result : result[0];

                expect(resolved).to.deep.equal({ ...details, ...contract });
                expect(resolved.contract).to.equal(contract);
            });

            it('should return no match when Gateway returns no details', async () => {
                const { manager } = buildManager();

                const result = await manager[method](savedContract());

                expect(result).to.deep.equal(method === 'getContract' ? null : []);
            });

            it('should return no match when Gateway rejects the query', async () => {
                const { manager } = buildManager([], new Error('Contract not found'));

                const result = await manager[method](savedContract());

                expect(result).to.deep.equal(method === 'getContract' ? null : []);
            });
        });
    }

    it('should reuse resolved details when getContract receives a nested contract', async () => {
        const { manager, calls } = buildManager();
        const contract = savedContract();
        const details = { ...contract, contract, minTick: 0.1 };

        const result = await manager.getContract(details);

        expect(result).to.equal(details);
        expect(calls).to.deep.equal([]);
    });
});
