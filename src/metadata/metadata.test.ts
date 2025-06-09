import 'mocha';
import 'dotenv/config';
import {expect} from 'chai';
import {IBKRConnection} from '../connection';
import {SecType} from '@stoqey/ib';

before((done) => {
    IBKRConnection.Instance.init().then((started) => {
        if (started) {
            return done();
        }
        done(new Error('error starting ibkr'));
    });
});

describe('Contract details metadata', () => {
    it('should connect to IBKR', (done) => {
        expect(IBKRConnection.Instance.connected).to.be.true;
        done();
    });
    it('should get contract metadata', async () => {
        const symbol = 'SPX';
        const contract = await IBKRConnection.Instance.ib.getContractDetails({
            symbol,
            secType: SecType.IND,
        });
        console.log(contract[0].contract);
        expect(contract).to.be.not.empty;
    });
});

describe('Options metadata', () => {
    it('should connect to IBKR', (done) => {
        expect(IBKRConnection.Instance.connected).to.be.true;
        done();
    });
    it('should get option definitions definitions', async () => {
        const symbol = 'SPX';
        const contract = await IBKRConnection.Instance.ib.getContractDetails({
            symbol,
            secType: SecType.IND,
        });
        const optionDefinitions = await IBKRConnection.Instance.ib.getSecDefOptParams(
            symbol,
            '',
            SecType.IND,
            contract[0].contract.conId
        );
        console.log(optionDefinitions);
        expect(optionDefinitions).to.be.not.empty;
    });
});
