import { OrderAction } from "../interfaces";

import { Position } from "../interfaces";

/**
 * Get Profit percentage gained
 * https://www.investopedia.com/ask/answers/how-do-you-calculate-percentage-gain-or-loss-investment/
 * @param startPrice 
 * @param endPrice 
 */
export const getPercentageGain = (startPrice: number, endPrice: number) => {
  return (endPrice - startPrice) / startPrice * 100;
}

/**
* GetTotalProfitAmount, from start and end
* @param start 
* @param end 
* @param capital 
*/
export const getTotalProfitAmount = (start: number, end: number, capital: number, sell: boolean = false): number => {
  const profit = sell? start - end : end - start;
  return (profit / start) * capital;
}


export const calculatePnl = (positions: Position[]) => {
  return positions.reduce((acc, position) => {
      const amount = position.quantity * position.price;
      const pnl = position.lastPrice ? getTotalProfitAmount(position.price, position.lastPrice, amount, position.action === OrderAction.SELL) : 0;
      return acc + pnl;
  }, 0);

};