let d = 0;

class PromClass {
    d = 0;

    Prom = () => {
        const self = this;
        return new Promise((resolve, reject) => {
            let count = 0;
            setTimeout(() => {
                resolve({})
            }, 1000000);

            setInterval(() => {
                self.d = count++;
            }, 1000);
        })
    }

}
// const Prom = () => {
//     return new Promise((resolve, reject) => {
//         let count = 0;
//         setTimeout(() => {
//             resolve({})
//         }, 1000000);

//         setInterval(() => {
//             d = count++;
//         }, 1000);
//     })
// }
// Prom();


const pro = new PromClass;

setInterval(() => {
    console.log('We have D as', pro.d);
}, 1000);

pro.Prom();


