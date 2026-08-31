import type { WeatherData } from "./useWeather";

type HomePreloadState = {
  articles: any | null;
  featured: any[] | null;
  stats: Record<string, number> | null;
  weather: WeatherData | null;
  visitors: any[] | null;
  ready: boolean;
};

let preloadPromise: Promise<void> | null = null;

export function useHomePreload() {
  const state = useState<HomePreloadState>("home-preload", () => ({
    articles: null,
    featured: null,
    stats: null,
    weather: null,
    visitors: null,
    ready: false,
  }));

  async function preloadHomeContent() {
    if (state.value.ready) return;
    if (preloadPromise) return preloadPromise;

    preloadPromise = (async () => {
      const api = useApi();
      const { loadCircleFeature, loadChangelogFeature } = useFeatureFlags();
      const results = await Promise.allSettled([
        api.get(
          "/posts",
          { page: 1, limit: 10, sort: "latest" },
          { signal: AbortSignal.timeout(10000) },
        ),
        api.get<any[]>("/posts/featured", undefined, {
          signal: AbortSignal.timeout(10000),
        }),
        api.get<Record<string, number>>("/stats/overview", undefined, {
          signal: AbortSignal.timeout(10000),
        }),
        api.get<WeatherData>("/weather", undefined, {
          signal: AbortSignal.timeout(10000),
        }),
        api.get("/visitor/recent", undefined, {
          signal: AbortSignal.timeout(10000),
        }),
        loadCircleFeature(),
        loadChangelogFeature(),
      ]);

      const [articles, featured, stats, weather, visitors] = results;
      if (articles.status === "fulfilled")
        state.value.articles = articles.value;
      if (featured.status === "fulfilled")
        state.value.featured = featured.value || [];
      if (stats.status === "fulfilled") state.value.stats = stats.value || {};
      if (weather.status === "fulfilled") state.value.weather = weather.value;
      if (visitors.status === "fulfilled")
        state.value.visitors = Array.isArray(visitors.value)
          ? visitors.value
          : [];
      state.value.ready = true;
    })().finally(() => {
      preloadPromise = null;
    });

    return preloadPromise;
  }

  return { state, preloadHomeContent };
}
