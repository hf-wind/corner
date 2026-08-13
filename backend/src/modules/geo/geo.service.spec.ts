import { GeoService } from './geo.service';

describe('GeoService', () => {
  const redis = {
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn().mockResolvedValue(undefined),
    client: {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    },
  } as any;
  const service = new GeoService(redis);

  const IP_API_URL = 'http://ip-api.com/json';

  afterEach(() => {
    jest.restoreAllMocks();
    redis.getJson.mockResolvedValue(null);
    redis.client.incr.mockResolvedValue(1);
  });

  function mockIpApi(body: unknown) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    } as any) as any;
    return global.fetch as jest.Mock;
  }

  it('私有 IP 直接返回 null，不发外部请求', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;
    expect(await service.locate('127.0.0.1')).toBeNull();
    expect(await service.locate('::1')).toBeNull();
    expect(await service.locate('192.168.1.5')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ip-api 成功时返回结构化地区与 label', async () => {
    mockIpApi({
      status: 'success',
      country: '中国',
      regionName: '浙江省',
      city: '杭州市',
      query: '8.8.8.8',
    });
    const info = await service.locate('8.8.8.8');
    expect(info).toEqual({
      country: '中国',
      regionName: '浙江省',
      city: '杭州市',
      label: '浙江 · 杭州',
    });
    expect(redis.setJson).toHaveBeenCalledWith(
      'corner:geo:ip:8.8.8.8',
      expect.anything(),
      expect.any(Number),
    );
  });

  it('命中 Redis 缓存时不调外部接口', async () => {
    redis.getJson.mockResolvedValue({
      country: '中国',
      regionName: '浙江省',
      city: '杭州市',
      label: '浙江 · 杭州',
    });
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;
    const info = await service.locate('8.8.8.8');
    expect(info?.label).toBe('浙江 · 杭州');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('超过分钟限速时静默返回 null', async () => {
    redis.client.incr.mockResolvedValue(31);
    expect(await service.locate('8.8.8.8')).toBeNull();
    expect(redis.client.expire).toHaveBeenCalled();
  });

  it('接口失败/异常时静默返回 null（含负缓存）', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout')) as any;
    expect(await service.locate('8.8.8.8')).toBeNull();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'fail' }),
    } as any) as any;
    expect(await service.locate('1.1.1.1')).toBeNull();
  });
});
