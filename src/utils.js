export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const between = (a, b) => a + Math.random() * Math.abs(b - a);

export const exponantionBackoffWithOffset = (n) => between(1000, 3000) + (100 * n * n);

export const indexBasedBatch = (index, batchSize, ms) => Math.floor(index / batchSize) * ms;

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

export function withRetry(f, totalRetries = 5) {
  return function (...args) {
    return (function retryF(attemptedRetries) {
      return Promise.resolve()
        .then(() => f(...args))
        .catch(err => ((err && err.cancelRetry) || attemptedRetries >= totalRetries)
          ? Promise.reject(`Retry failed, ${err && err.message}`)
          : delay(exponantionBackoffWithOffset(attemptedRetries)).then(() => retryF(attemptedRetries + 1))
        );
    }(0));
  };
};
