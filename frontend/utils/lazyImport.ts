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
        useClientState().removeSession(`moduleReload:${recoveryKey}`);
      return value;
    }).catch((error) => {
      if (attempt < retries) {
        attempt += 1;
        return new Promise<T>((resolve) => {
          window.setTimeout(resolve, delayMs * attempt);
        }).then(run);
      }

      if (recoveryKey && typeof window !== "undefined") {
        if (useClientState().getSession(`moduleReload:${recoveryKey}`, false) !== true) {
          useClientState().setSession(`moduleReload:${recoveryKey}`, true);
          window.location.reload();
          return new Promise<T>(() => undefined);
        }
        useClientState().removeSession(`moduleReload:${recoveryKey}`);
      }
      attempt += 1;
      throw error;
    });

  return run();
}
