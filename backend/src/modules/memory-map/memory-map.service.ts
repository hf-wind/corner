import { createHash } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { toGcj02 } from '../../common/location/coordinates';
import { RedisService } from '../../common/redis/redis.service';
import { AlbumService } from '../album/album.service';
import { MomentService } from '../moment/moment.service';
import { MemoryMapQueryDto } from './dto/memory-map-query.dto';
import type { MapMemoryType, PublicMapMemory } from './memory-map.types';

type MapPoint = PublicMapMemory & {
  longitude: number;
  latitude: number;
  precision: string;
  placeName: string;
  placeSlug?: string;
};

type MapCluster = {
  id: string;
  kind: 'cluster';
  longitude: number;
  latitude: number;
  count: number;
  types: Record<MapMemoryType, number>;
  bounds: { west: number; south: number; east: number; north: number };
  sampleIds: string[];
};

type MapItem = Omit<MapPoint, 'publicLocation'> & { kind: 'memory' };

@Injectable()
export class MemoryMapService {
  constructor(
    private readonly moments: MomentService,
    private readonly albums: AlbumService,
    private readonly redis: RedisService,
  ) {}

  async findMap(query: MemoryMapQueryDto) {
    this.validateBounds(query);
    const normalized = this.normalizeQuery(query);
    const version = await this.redis.cacheVersion().catch(() => '1');
    const cacheKey = `corner:memory-map:v2:${version}:${createHash('sha256').update(JSON.stringify(normalized)).digest('hex')}`;
    const cached = await this.redis.getJson<any>(cacheKey).catch(() => null);
    if (cached) return cached;

    const viewportPoints = (await this.allPoints())
      .filter((point) => this.matches(point, normalized, false));
    const places = [...new Map(viewportPoints
      .filter((point) => point.placeSlug)
      .map((point) => [point.placeSlug!, { slug: point.placeSlug!, name: point.placeName }])).values()]
      .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
    const points = normalized.place
      ? viewportPoints.filter((point) => point.placeSlug === normalized.place)
      : viewportPoints;
    const clustered = this.cluster(points, normalized.zoom);
    const items = clustered.slice(0, 500);
    const payload = {
      items,
      totalMemories: points.length,
      returned: items.length,
      truncated: clustered.length > 500,
      places,
      filters: {
        types: normalized.types,
        year: normalized.year,
        place: normalized.place,
      },
    };
    await this.redis.setJson(cacheKey, payload, 120).catch(() => undefined);
    return payload;
  }

  async findPlace(slug: string) {
    const points = (await this.allPoints()).filter((point) => point.placeSlug === slug);
    if (!points.length) throw new NotFoundException('地点不存在或暂无公开记忆');
    const first = points[0];
    return {
      place: {
        name: first.placeName,
        slug,
        city: first.publicLocation.city,
        province: first.publicLocation.province,
        country: first.publicLocation.country,
        longitude: first.longitude,
        latitude: first.latitude,
        precision: first.precision,
      },
      articles: [],
      moments: points.filter((item) => item.type === 'moment').map((item) => this.toMemory(item)),
      photos: points.filter((item) => item.type === 'photo').map((item) => this.toMemory(item)),
      albums: points.filter((item) => item.type === 'album').map((item) => this.toMemory(item)),
    };
  }

  private async allPoints(): Promise<MapPoint[]> {
    const version = await this.redis.cacheVersion().catch(() => '1');
    const cacheKey = `corner:memory-map:v2:${version}:public-points`;
    const cached = await this.redis.getJson<MapPoint[]>(cacheKey).catch(() => null);
    if (cached) return cached;
    const memories = (await Promise.all([
      this.moments.findPublicMapMemories(),
      this.albums.findPublicMapMemories(),
    ])).flat();
    const points = memories.map((memory) => {
      const location = memory.publicLocation;
      const mapLocation = toGcj02(Number(location.longitude), Number(location.latitude));
      return {
        ...memory,
        longitude: mapLocation.longitude,
        latitude: mapLocation.latitude,
        precision: location.precision,
        placeName: location.name,
        placeSlug: location.slug,
      };
    });
    await this.redis.setJson(cacheKey, points, 120).catch(() => undefined);
    return points;
  }

  private normalizeQuery(query: MemoryMapQueryDto) {
    const allowed = new Set<MapMemoryType>(['moment', 'album', 'photo']);
    const types = String(query.types || '')
      .split(',')
      .map((value) => value.trim() as MapMemoryType)
      .filter((value) => allowed.has(value));
    return {
      west: Number(query.west.toFixed(5)),
      south: Number(query.south.toFixed(5)),
      east: Number(query.east.toFixed(5)),
      north: Number(query.north.toFixed(5)),
      zoom: Number(query.zoom.toFixed(2)),
      types: types.length ? [...new Set(types)].sort() : [...allowed],
      year: query.year,
      place: query.place?.trim() || undefined,
    };
  }

  private validateBounds(query: MemoryMapQueryDto) {
    if (query.south >= query.north) throw new BadRequestException('地图南北边界无效');
    if (query.west === query.east) throw new BadRequestException('地图东西边界无效');
  }

  private matches(point: MapPoint, query: ReturnType<MemoryMapService['normalizeQuery']>, includePlace = true) {
    const longitudeMatches = query.west < query.east
      ? point.longitude >= query.west && point.longitude <= query.east
      : point.longitude >= query.west || point.longitude <= query.east;
    if (!longitudeMatches || point.latitude < query.south || point.latitude > query.north) return false;
    if (!query.types.includes(point.type)) return false;
    if (includePlace && query.place && point.placeSlug !== query.place) return false;
    if (query.year) {
      const date = point.occurredAt ? new Date(point.occurredAt) : null;
      if (!date || Number.isNaN(date.getTime()) || date.getUTCFullYear() !== query.year) return false;
    }
    return true;
  }

  private cluster(points: MapPoint[], zoom: number): Array<MapCluster | MapItem> {
    if (zoom >= 15) return points.map((point) => this.toMemory(point));
    const cellDegrees = 360 / (256 * 2 ** Math.max(1, Math.floor(zoom))) * (zoom < 7 ? 110 : zoom < 11 ? 72 : 44);
    const cells = new Map<string, MapPoint[]>();
    for (const point of points) {
      const key = `${Math.floor(point.longitude / cellDegrees)}:${Math.floor(point.latitude / cellDegrees)}`;
      const cell = cells.get(key) || [];
      cell.push(point);
      cells.set(key, cell);
    }
    return [...cells.entries()].map(([key, cell]) => {
      if (cell.length === 1) return this.toMemory(cell[0]);
      const longitudes = cell.map((item) => item.longitude);
      const latitudes = cell.map((item) => item.latitude);
      return {
        id: `cluster:${zoom}:${key}`,
        kind: 'cluster' as const,
        longitude: longitudes.reduce((sum, value) => sum + value, 0) / cell.length,
        latitude: latitudes.reduce((sum, value) => sum + value, 0) / cell.length,
        count: cell.length,
        types: {
          moment: cell.filter((item) => item.type === 'moment').length,
          album: cell.filter((item) => item.type === 'album').length,
          photo: cell.filter((item) => item.type === 'photo').length,
        },
        bounds: {
          west: Math.min(...longitudes),
          south: Math.min(...latitudes),
          east: Math.max(...longitudes),
          north: Math.max(...latitudes),
        },
        sampleIds: cell.slice(0, 8).map((item) => item.id),
      };
    });
  }

  private toMemory(point: MapPoint): MapItem {
    const { publicLocation: _location, ...rest } = point;
    return { ...rest, kind: 'memory' };
  }
}
