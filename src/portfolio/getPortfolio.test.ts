import test from 'ava';
import isEmpty from 'lodash/isEmpty';
// import { getPortfolio } from './getPortfolio';

import IbConnection from '../ibConnection';
import chalk from 'chalk';

test.after(t => {
    IbConnection.Instance.disconnectIBKR();
});

test('Get All portfolios', async t => {
    // const accountPortfolios = await getPortfolio(true);
    // console.log(chalk.yellowBright(`-----------------------------ALL-PORTFOLIOS-------------------------------`))
    // t.is(isEmpty(accountPortfolios), false);
});


// test('Get Active portfolios', async t => {
//     const accountPortfolios = await getPortfolio(true);
//     console.log(chalk.blue(`-----------------------------ACTIVE-PORTFOLIO-------------------------------`))
//     t.is(isEmpty(accountPortfolios), false);
// });