import type { Contract } from "@stoqey/ib";
import { getSymbolKey } from "./instrument.utils";

export type ContractFilterScope = "orders" | "positions" | "marketdata";

export type ContractLike = {
    contract?: Contract;
    exchange?: string;
    lastTradeDate?: string;
    lastTradeDateOrContractMonth?: string;
    secType?: string;
    symbol?: string;
    type?: string;
};

const CONTRACT_FILTER_ENV_BY_SCOPE: Record<ContractFilterScope, string[]> = {
    orders: ["IBKR_CONTRACTS_ORDERS", "IBKR_CONTRACTS_ORDER"],
    positions: ["IBKR_CONTRACTS_POSITIONS", "IBKR_CONTRACTS_POSITION"],
    marketdata: ["IBKR_CONTRACTS_MARKETDATA", "IBKR_CONTRACTS_MD"],
};

const GLOBAL_CONTRACT_FILTER_ENV = "IBKR_CONTRACTS";
const WILDCARD_CONTRACT_FILTER = "*";

const normalizeContractFilterValue = (value?: string | number): string => {
    return `${value ?? ""}`.trim().toUpperCase();
};

const getScopedEnvValue = (
    scope: ContractFilterScope,
    env: Record<string, string | undefined>
): string | undefined => {
    const envKeys = CONTRACT_FILTER_ENV_BY_SCOPE[scope] || [];
    for (const envKey of envKeys) {
        const value = env[envKey];
        if (value && value.trim()) {
            return value;
        }
    }
    return env[GLOBAL_CONTRACT_FILTER_ENV];
};

export const parseContractFilter = (value?: string): string[] => {
    return `${value || ""}`
        .split(/[,\s;]+/)
        .map(normalizeContractFilterValue)
        .filter(Boolean);
};

export const getContractFilters = (
    scope: ContractFilterScope,
    env: Record<string, string | undefined> = process.env
): string[] => {
    return parseContractFilter(getScopedEnvValue(scope, env));
};

export const hasContractFilter = (
    scope: ContractFilterScope,
    env: Record<string, string | undefined> = process.env
): boolean => {
    return getContractFilters(scope, env).some((filter) => filter !== WILDCARD_CONTRACT_FILTER);
};

const unwrapContract = (contract?: ContractLike): ContractLike => {
    if ((contract as ContractLike)?.contract) {
        return (contract as ContractLike).contract as ContractLike;
    }
    return contract || {};
};

export const getContractFilterKeys = (contract?: ContractLike): string[] => {
    const unwrapped = unwrapContract(contract);
    const symbol = normalizeContractFilterValue(unwrapped?.symbol);
    const secType = normalizeContractFilterValue(unwrapped?.secType || unwrapped?.type);
    const exchange = normalizeContractFilterValue(unwrapped?.exchange);
    const lastTradeDate = normalizeContractFilterValue(
        unwrapped?.lastTradeDate || unwrapped?.lastTradeDateOrContractMonth
    );
    const symbolKey = normalizeContractFilterValue(getSymbolKey(unwrapped as Contract));
    const keys: string[] = [];

    if (symbol) {
        keys.push(symbol);
    }

    if (symbol && secType) {
        keys.push(`${symbol}-${secType}`);
    }

    if (symbol && secType && lastTradeDate) {
        keys.push(`${symbol}-${secType}-${lastTradeDate}`);
        if (lastTradeDate.length >= 6) {
            keys.push(`${symbol}-${secType}-${lastTradeDate.slice(0, 6)}`);
        }
    }

    if (symbol && secType && exchange) {
        keys.push(`${symbol}-${secType}-${exchange}`);
    }

    if (symbolKey) {
        keys.push(symbolKey);
    }

    return Array.from(new Set(keys));
};

export const isContractAllowed = (
    contract: ContractLike | undefined,
    scope: ContractFilterScope,
    env: Record<string, string | undefined> = process.env
): boolean => {
    const filters = getContractFilters(scope, env);
    if (filters.length === 0 || filters.includes(WILDCARD_CONTRACT_FILTER)) {
        return true;
    }

    const contractKeys = getContractFilterKeys(contract);
    if (contractKeys.length === 0) {
        return false;
    }

    return filters.some((filter) => contractKeys.includes(filter));
};

export const getContractFilterLabel = (
    scope: ContractFilterScope,
    env: Record<string, string | undefined> = process.env
): string => {
    return getContractFilters(scope, env).join(", ");
};
