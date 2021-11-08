export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const between = (a, b) => a + Math.random() * (b - a);

export const reportToConsole = err => (err
  ? console.error('Error!', err)
  : console.log('Success!')
);

export const throwIfNot200 = msg => res => (res.status === 200) 
  ? res
  : Promise.reject(new Error(msg));


export function withRetry(f, retriesLeft = 5) {
  return function fWithRetries(...args) {
    return Promise.resolve().then(() => f(...args)).catch(err => retriesLeft > 0
      ? delay(between(1000,3000)).then(() => fWithRetries(...args, retriesLeft - 1))
      : Promise.reject('Retry failed')
    );
  };
};
