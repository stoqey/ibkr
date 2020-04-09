import random = require("lodash/random");

export const getRadomReqId = () => {
    return random(100, 100000);
}