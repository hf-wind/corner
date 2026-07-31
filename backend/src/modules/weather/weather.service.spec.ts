import { WeatherService } from './weather.service';

describe('WeatherService', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('maps QWeather data and caches the public snapshot', async () => {
    process.env = { ...originalEnv, QWEATHER_KEY: 'test-key', QWEATHER_HOST: 'weather.example.test' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code: '200', updateTime: '2026-07-31T12:00+08:00', now: { temp: '36', feelsLike: '40', text: '晴', icon: '100', humidity: '50', windDir: '西南风', windScale: '3', obsTime: '2026-07-31T12:00+08:00' } }),
    }) as jest.Mock;
    const redis = { getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn().mockResolvedValue(undefined) } as any;

    const result = await new WeatherService(redis).getWeather();

    expect(result).toMatchObject({ temperature: 36, condition: '晴', icon: '100', city: '绍兴', windScale: '3' });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/v7/weather/now?location=101210501'), expect.objectContaining({ headers: expect.objectContaining({ 'X-QW-Api-Key': 'test-key' }) }));
    expect(redis.setJson).toHaveBeenCalledTimes(2);
  });

  it('uses stale cache when the provider is unavailable', async () => {
    process.env = { ...originalEnv, QWEATHER_KEY: 'test-key' };
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as jest.Mock;
    const stale = { temperature: 20, feelsLike: 20, condition: '阴', icon: '104', city: '绍兴', humidity: 70, windDirection: '东风', windScale: '2', observedAt: '', updatedAt: '' };
    const redis = { getJson: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(stale), setJson: jest.fn() } as any;

    await expect(new WeatherService(redis).getWeather()).resolves.toMatchObject({ ...stale, stale: true });
  });

  it('does not let an unavailable cache block the weather provider', async () => {
    jest.useFakeTimers();
    process.env = { ...originalEnv, QWEATHER_KEY: 'test-key' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code: '200', now: { temp: '30', feelsLike: '32', text: '多云', icon: '101', humidity: '61', windDir: '东风', windScale: '2' } }),
    }) as jest.Mock;
    const redis = { getJson: jest.fn(() => new Promise(() => undefined)), setJson: jest.fn(() => new Promise(() => undefined)) } as any;

    const result = new WeatherService(redis).getWeather();
    await jest.advanceTimersByTimeAsync(1200);

    await expect(result).resolves.toMatchObject({ temperature: 30, condition: '多云' });
    jest.useRealTimers();
  });
});
