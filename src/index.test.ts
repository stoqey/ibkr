import 'mocha';
import { expect } from 'chai';
import ibkr from '.'
import { IBKRConnection } from './connection';

describe('Given IBKR library', () => {
    const originalInstance = (IBKRConnection as any)._instance;

    afterEach(() => {
        (IBKRConnection as any)._instance = originalInstance;
    });

    it('should successfully run ibkr', async () => {
        (IBKRConnection as any)._instance = {
            init: () => Promise.resolve(true),
        };

        const connectionStatus = await ibkr();
        expect(connectionStatus).to.be.equal(true);
    });

    it('should pass creation options to the default initializer', async () => {
        const options = { host: 'localhost', port: 4002 };
        let receivedOptions: unknown;
        (IBKRConnection as any)._instance = {
            init: (opt?: unknown) => {
                receivedOptions = opt;
                return Promise.resolve(true);
            },
        };

        const connectionStatus = await ibkr(options);

        expect(connectionStatus).to.be.equal(true);
        expect(receivedOptions).to.equal(options);
    });

});
