import * as _ from 'lodash';
import chalk from 'chalk';
import ibkr from 'ib';
import { IB_HOST, IB_PORT } from '../config'
import { publishDataToTopic } from '../events/AppEvents.publisher';
import { APPEVENTS } from 'src/events/APPEVENTS.const';
// This has to be unique per this execution
const clientId = _.random(100, 100000);

/**
 * Global IBKR connection
 * @singleton class
 */
export class IBKRConnection {

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

        // Important listners
        this.ib.on('connected', function (err: Error) {
          
            if(err){
                return console.log(APPEVENTS.CONNECTED, chalk.red(`IBKR error connecting client => ${clientId}`));
            }

            console.log(chalk.green(`IBKR Connected client => ${clientId}`));

            publishDataToTopic({
                topic: APPEVENTS.CONNECTED,
                data: {
                    connected: true
                }
            });
        })

        this.ib.on('error', function (err: Error) {
            console.log(APPEVENTS.ERROR_CONNECT, chalk.red(err && err.message));
        })

        this.ib.on('disconnected', function (err: Error) {
            console.log(APPEVENTS.DISCONNECTED, chalk.red(`Connection disconnected => ${clientId}`));
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
        try {
            console.log(chalk.keyword("orange")(`IBKR Force shutdown ${clientId} 😴😴😴`));
            this.ib.disconnect();
        }
        catch (error) {
            console.log(chalk.red(error))
        }

    }


}
export default IBKRConnection;