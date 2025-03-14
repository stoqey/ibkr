import _get from 'lodash/get';
import debug from 'debug';

export const appName = process.env.APP_NAME || "IBKR";

const libraryPrefix = appName;

/**
 * Use to log in general case
 */
export const log = debug(`${libraryPrefix}:info`);

/**
 * Use for verbose log
 */
export const verbose = debug(`${libraryPrefix}:verbose`);

/**
 * Use for warn log
 */
export const warn = debug(`${libraryPrefix}:warn`);
