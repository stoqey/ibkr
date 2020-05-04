import 'mocha';
import { expect } from 'chai';
import ibkr from '.'

describe('Given IBKR library', () => {

    it('should successfully run ibkr', async () => {
        // @ts-ignore
        const connectionStatus = await ibkr();
        expect(connectionStatus).to.be.equal(true);
    });

});