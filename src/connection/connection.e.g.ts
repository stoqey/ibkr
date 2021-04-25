import IBKRConnection from './IBKRConnection';

async function connect() {
    const ibApp = IBKRConnection.app;
    await ibApp.start();
    // await delay(6000, null);
}
connect();
