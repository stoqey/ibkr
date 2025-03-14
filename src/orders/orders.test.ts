import 'mocha';
import "dotenv/config";
import { expect, assert } from 'chai'
import { IBKRConnection } from '../connection';
import { SecType } from '@stoqey/ib';
import Orders from './Orders';

before((done) => {
    IBKRConnection.Instance.init().then(started => {
        if (started) {
            Orders.Instance.init();
            return done();
        }
        done(new Error('error starting ibkr'))
    })
})

describe('IBKR Orders', () => {
    it('should connect to IBKR', (done) => {
        expect(IBKRConnection.Instance.connected).to.be.true;
        done();
    });
    
    it('should get open orders', async() => {
        const orders = await Orders.Instance.getOrders();
        console.log("orders count", orders.length);
        expect(orders).to.be.not.empty;
    });
})

