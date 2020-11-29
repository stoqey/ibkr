export const createSymbolAndOrderID = (symbol: string, tickerId: number): string => {
    const symbolClean = symbol.replace(/[^a-zA-Z ]/g, '');
    return `${symbolClean}_${tickerId}`;
};
