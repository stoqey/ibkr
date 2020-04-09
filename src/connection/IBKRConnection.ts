import * as _ from 'lodash';
import chalk from 'chalk';
import ibkr from 'ib';
import { IB_HOST, IB_PORT } from '../config'
import { publishDataToTopic } from '../events/AppEvents.publisher';
import { APPEVENTS } from '../events/APPEVENTS.const';
import { ConnectionStatus } from './connection.interfaces';

// This has to be unique per this execution
const clientId = _.random(100, 100000);

/**
 * Global IBKR connection
 * @singleton class
 */
export class IBKRConnection {

    public status: ConnectionStatus = APPEVENTS.DISCONNECTED;
    public IB_PORT: number = IB_PORT;
    public IB_HOST: string = IB_HOST;
    private static _instance: IBKRConnection;

    public ib: any;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {

        this.ib = new ibkr({
            clientId,
            host: this.IB_HOST,
            port: this.IB_PORT
        });

        this.listen();
    }

    /**
     * On listen for IB connection
     */
    private listen(): void {

        const self: IBKRConnection = this;

        // Important listners
        this.ib.on(APPEVENTS.CONNECTED, function (err: Error) {
          
            if(err){

                publishDataToTopic({
                    topic: APPEVENTS.DISCONNECTED,
                    data: {}
                });

                return console.log(APPEVENTS.DISCONNECTED, chalk.red(`IBKR error connecting client => ${clientId}`));
            }

            console.log(chalk.green(`IBKR Connected client => ${clientId}`));

            publishDataToTopic({
                topic: APPEVENTS.CONNECTED,
                data: {
                    connected: true
                }
            });

            self.status = APPEVENTS.CONNECTED;
        })

        this.ib.on(APPEVENTS.ERROR, function (err: any) {
            console.log(APPEVENTS.ERROR, err);

            // If connection error, emit disconnect
            if(err && err.code === 'ECONNREFUSED'){
                publishDataToTopic({
                    topic: APPEVENTS.DISCONNECTED,
                    data: {}
                });
            }
        })

        this.ib.on(APPEVENTS.DISCONNECTED, function (err: Error) {
            console.log(APPEVENTS.DISCONNECTED, chalk.red(`Connection disconnected => ${clientId}`));
            self.status = APPEVENTS.DISCONNECTED;
        });

        // connect the IBKR
        this.ib.connect();

    }



    /**
     * getIBKR instance
     */
    public getIBKR(): any {
        return this.ib;
    }


    /**
     * disconnectIBKR
     */
    public disconnectIBKR(): void {
        this.status = APPEVENTS.DISCONNECTED;
        try {
            console.log(chalk.keyword("orange")(`IBKR Force shutdown ${clientId} 😴😴😴`));
            this.ib.disconnect();
        }
        catch (error) {
            console.log(APPEVENTS.ERROR, chalk.red(error))
        }

    }


}
export default IBKRConnection;