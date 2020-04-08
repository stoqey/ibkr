import os from 'os';
const { env } = process;

// Envs
export const isDev = env.NODE_ENV !== 'production';

if (isDev) {
    require('dotenv').config();
}

export const IB_PORT: number = +(env.IB_PORT || 7496);
export const IB_HOST: string = env.IB_HOST || '127.0.0.1';