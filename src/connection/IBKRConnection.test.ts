import 'mocha';
import "dotenv/config";
import { expect, assert } from 'chai'
import { IBKRConnection } from './IBKRConnection';
import { SecType } from '@stoqey/ib';

before((done) => {
    IBKRConnection.Instance.init().then(started => {
        if (started) {
            return done();
        }
        done(new Error('error starting ibkr'))
    })
})

describe('IBKR Connection', () => {
    it('should connect to IBKR', (done) => {
        expect(IBKRConnection.Instance.connected).to.be.true;
        done();
    });

    it('should get contract details', async() => {
        const symbol = "SAVA";
        const contract = await IBKRConnection.Instance.ib.getContractDetails({ symbol, secType: SecType.STK });
        expect(contract[0].contract.symbol === symbol).to.be.true;
    });

    it('should get future contract details', async() => {
        const symbol = "MNQ";
        const contract = await IBKRConnection.Instance.ib.getContractDetails({ symbol, secType: SecType.FUT });
        console.log(contract[0].contract);
        expect(contract[0].contract.symbol === symbol).to.be.true;
    });
})

