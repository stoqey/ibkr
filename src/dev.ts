import 'mocha';
import {expect} from 'chai';
import ibkr from '.';

const main = async () => {
    // @ts-ignore
    const connectionStatus = await ibkr();
    expect(connectionStatus).to.be.equal(true);
};

main();
