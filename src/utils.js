export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const between = (a, b) => a + Math.random() * Math.abs(b - a);

export const reportToConsole = err => (err
  ? console.error('Error!', err)
  : console.log('Success!')
);

export const throwIfNot200 = msg => res => (res.status === 200) 
  ? res
  : Promise.reject(new Error(msg));


export const anyErrors = errors => {
  return errors.reduce((result, err) => {
    if (err) { result = err; }

    return result;
  }, null)
};

export function CancelError(message) {
  const err = new Error(message);
  err.cancelRetry = true;

  return err;
};

export function withRetry(f, retries = 20) {
  return function fWithRetries(...args) {
    return (function () {
      let retriesLeft = retries;    
      return Promise.resolve()
        .then(() => f(...args))
        .catch(err => ((err && err.cancelRetry) || retriesLeft <= 0)
          ? Promise.reject(`Retry failed, ${err && err.message}`)
          : delay(between(3000, 5000)).then(() => {
            retriesLeft -= 1;
            return fWithRetries(...args);
          }) 
      );
    }());
  };
};
