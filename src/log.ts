import { isDev, forceLog } from './config';
export const log = (logName: any, data?: any) => {
    if (isDev || forceLog) {
        if (data) {
            return console.log(logName, data)
        }
        return console.log(logName)

    }
}

