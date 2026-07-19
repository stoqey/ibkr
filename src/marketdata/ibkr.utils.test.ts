import { expect } from 'chai';
import { formatHistoricalEndDateTime } from './ibkr.utils';

describe('IBKR historical data end timestamp', () => {
    it('should serialize a 4:00PM EDT date as UTC', () => {
        const localDate = new Date('2026-06-03T16:00:00-04:00');

        const endDateTime = formatHistoricalEndDateTime(localDate);

        expect(endDateTime).to.equal('20260603-20:00:00');
    });
});
