export function delay(t: number, v: string): Promise<any> {
    return new Promise(function (resolve) {
        setTimeout(resolve.bind(null, v), t);
    });
}
