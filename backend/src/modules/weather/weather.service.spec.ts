import { WeatherService } from './weather.service';

describe('WeatherService', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('maps Open-Meteo data and caches the public snapshot', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          current: {
            temperature_2m: 36.4,
            relative_humidity_2m: 52,
            apparent_temperature: 40.1,
            weather_code: 1,
            wind_speed_10m: 14.2,
            wind_direction_10m: 200,
          },
        }),
    });
    const redis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
    } as any;

    const result = await new WeatherService(redis).getWeather();

    expect(result).toMatchObject({
      temperature: 36,
      feelsLike: 40,
      condition: '基本晴',
      icon: '1',
      city: '绍兴',
      humidity: 52,
      windDirection: '南风',
      windScale: '3级',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.open-meteo.com/v1/forecast'),
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(redis.setJson).toHaveBeenCalledTimes(2);
  });

  it('uses stale cache when the provider is unavailable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const stale = {
      temperature: 20,
      feelsLike: 20,
      condition: '阴',
      icon: '3',
      city: '绍兴',
      humidity: 70,
      windDirection: '东风',
      windScale: '2级',
      observedAt: '',
      updatedAt: '',
    };
    const redis = {
      getJson: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(stale),
      setJson: jest.fn(),
    } as any;

    await expect(new WeatherService(redis).getWeather()).resolves.toMatchObject(
      { ...stale, stale: true },
    );
  });

  it('does not let an unavailable cache block the weather provider', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          current: {
            temperature_2m: 30.1,
            relative_humidity_2m: 61,
            apparent_temperature: 32.4,
            weather_code: 2,
            wind_speed_10m: 8,
            wind_direction_10m: 90,
          },
        }),
    });
    const redis = {
      getJson: jest.fn(() => new Promise(() => undefined)),
      setJson: jest.fn(() => new Promise(() => undefined)),
    } as any;

    const result = new WeatherService(redis).getWeather();
    await jest.advanceTimersByTimeAsync(1200);

    await expect(result).resolves.toMatchObject({
      temperature: 30,
      condition: '多云',
    });
    jest.useRealTimers();
  });
});
