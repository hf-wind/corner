/** Retry transient Vite/chunk fetch failures without hiding real module errors. */
export function importWithRetry<T>(
  loader: () => Promise<T>,
  retries = 2,
  delayMs = 180,
  recoveryKey?: string,
): Promise<T> {
  let attempt = 0;

  const run = (): Promise<T> =>
    loader().then((value) => {
      if (recoveryKey && typeof window !== "undefined")
        sessionStorage.removeItem(`corner:module-reload:${recoveryKey}`);
      return value;
    }).catch((error) => {
      if (attempt < retries) {
        attempt += 1;
        return new Promise<T>((resolve) => {
          window.setTimeout(resolve, delayMs * attempt);
        }).then(run);
      }

      if (recoveryKey && typeof window !== "undefined") {
        const marker = `corner:module-reload:${recoveryKey}`;
        if (sessionStorage.getItem(marker) !== "1") {
          sessionStorage.setItem(marker, "1");
          window.location.reload();
          return new Promise<T>(() => undefined);
        }
        sessionStorage.removeItem(marker);
      }
      attempt += 1;
      throw error;
    });

  return run();
}
