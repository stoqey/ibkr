import 'mocha';
import chalk from 'chalk';
import { expect } from 'chai';
import { onConnected  } from './connection.utilities';
import { IBKRConnection } from './IBKRConnection';


before(done => {
    async function connect() {
        const connection = await onConnected();
        if(connection){
            return done();
        }
        done(new Error('Failed to connect interactive brokers, please check envs'))
    }
    connect();
});

describe('Given IBKR with proper env, port, url', () => {

    // console.log('should be connected ')
    // const ibkr = IBKRConnection.Instance;

    it('should be connected to ibkr',  async () => {
        const connectionStatus = await onConnected();
        expect(connectionStatus).to.be.equal(true);
    });

});