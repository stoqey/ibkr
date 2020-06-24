import random = require('lodash/random');

export const getRadomReqId = (): number => {
    return random(100, 100000);
};
