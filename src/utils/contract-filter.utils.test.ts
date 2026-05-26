import 'mocha';
import { expect } from 'chai';
import {
    getContractFilterKeys,
    getContractFilters,
    hasContractFilter,
    isContractAllowed,
    parseContractFilter,
} from './contract-filter.utils';

describe('contract filter utils', () => {
    const nqFuture = {
        symbol: 'NQ',
        secType: 'FUT',
        lastTradeDateOrContractMonth: '20260622',
        exchange: 'CME',
    };

    const esFuture = {
        symbol: 'ES',
        secType: 'FUT',
        lastTradeDateOrContractMonth: '20260622',
        exchange: 'CME',
    };

    it('should parse comma separated contract filters', () => {
        expect(parseContractFilter('NQ-FUT,AAPL-STK, GC-FUT')).to.deep.equal([
            'NQ-FUT',
            'AAPL-STK',
            'GC-FUT',
        ]);
    });

    it('should generate broad and expiry-specific keys for futures contracts', () => {
        expect(getContractFilterKeys(nqFuture)).to.include.members([
            'NQ',
            'NQ-FUT',
            'NQ-FUT-20260622',
            'NQ-FUT-202606',
        ]);
    });

    it('should allow matching contracts and reject the rest when a global filter is set', () => {
        const env = { IBKR_CONTRACTS: 'NQ-FUT,AAPL-STK,GC-FUT' };

        expect(isContractAllowed(nqFuture, 'orders', env)).to.equal(true);
        expect(isContractAllowed(esFuture, 'orders', env)).to.equal(false);
    });

    it('should use scoped filters before the global filter', () => {
        const env = {
            IBKR_CONTRACTS: 'NQ-FUT',
            IBKR_CONTRACTS_ORDERS: 'ES-FUT',
        };

        expect(getContractFilters('orders', env)).to.deep.equal(['ES-FUT']);
        expect(isContractAllowed(esFuture, 'orders', env)).to.equal(true);
        expect(isContractAllowed(esFuture, 'marketdata', env)).to.equal(false);
    });

    it('should support wildcard scoped filters', () => {
        const env = {
            IBKR_CONTRACTS: 'NQ-FUT',
            IBKR_CONTRACTS_MARKETDATA: '*',
        };

        expect(hasContractFilter('marketdata', env)).to.equal(false);
        expect(isContractAllowed(esFuture, 'marketdata', env)).to.equal(true);
    });
});
