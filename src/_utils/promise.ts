export function delay(t: number, v: string) {
    return new Promise(function (resolve) {
        setTimeout(resolve.bind(null, v), t);
    });
}
