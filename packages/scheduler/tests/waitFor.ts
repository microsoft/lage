export function waitFor(condition: () => boolean, maxWait = 5000): Promise<void> {
  let retries = 0;
  const timeout = 100;
  const maxRetries = maxWait / timeout;

  return new Promise<void>((resolve, reject) => {
    const loop = (timer: NodeJS.Timeout) => {
      clearTimeout(timer);

      retries++;

      if (condition()) {
        resolve();
      } else if (retries > maxRetries) {
        reject();
      } else {
        timer = setTimeout(() => loop(timer), timeout);
      }
    };

    const initialTimer: NodeJS.Timeout = setTimeout(() => loop(initialTimer), timeout);
  });
}
