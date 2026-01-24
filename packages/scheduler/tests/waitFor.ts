export function waitFor(condition: () => boolean, maxWait: number = 5000): Promise<void> {
  let retries = 0;
  let timeout = 100;
  let maxRetries = maxWait / timeout;

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

    const timer: NodeJS.Timeout = setTimeout(() => loop(timer), timeout);
  });
}
