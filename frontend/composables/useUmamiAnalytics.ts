const UMAMI_SCRIPT_URL = "https://cloud.umami.is/script.js";
const UMAMI_WEBSITE_ID = "a6585859-ef86-48f6-bf03-ae1b02a4063d";

let loader: Promise<void> | null = null;

function currentRoute() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function loadUmami() {
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${UMAMI_SCRIPT_URL}"]`,
    );
    if (existing) {
      if ((window as any).umami) resolve();
      else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.defer = true;
    script.src = UMAMI_SCRIPT_URL;
    script.dataset.websiteId = UMAMI_WEBSITE_ID;
    script.dataset.autoTrack = "false";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(), { once: true });
    document.head.appendChild(script);
  });
  return loader;
}

export async function trackUmamiPageview(path: string) {
  if (!import.meta.env.PROD || path.startsWith("/admin")) return;
  try {
    await loadUmami();
    if (
      currentRoute() !== path ||
      window.location.pathname.startsWith("/admin")
    )
      return;
    (window as any).umami?.track();
  } catch {
    loader = null;
  }
}
