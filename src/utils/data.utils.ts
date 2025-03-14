export const formatDec = (num?: number, $ = false, places = 2) => {
    if (!num || isNaN(num)) {
        return num || 0;
    }
    if ($) {
        return `$${num.toFixed(places)}`;
    }
    return num.toLocaleString();
};