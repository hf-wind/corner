import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  distanceInMeters,
  toGcj02,
  toWgs84,
} from '../../common/location/coordinates';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { PlaceQueryDto } from './dto/place-query.dto';
import {
  ProviderReverseQueryDto,
  ProviderSearchQueryDto,
} from './dto/provider-place-query.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { MemoryGraphService } from '../memory-graph/memory-graph.service';

@Injectable()
export class PlaceService {
  constructor(
    private prisma: PrismaService,
    private memoryGraph?: MemoryGraphService,
  ) {}

  async findAllAdmin(query: PlaceQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.PlaceWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.place.findMany({
        where,
        include: { _count: { select: { moments: true } } },
        orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.place.count({ where }),
    ]);
    return {
      items: items.map((place) => this.formatAdmin(place)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBySlugAdmin(slug: string) {
    const place = await this.prisma.place.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            moments: true,
            albums: true,
            albumItems: true,
            confirmedMediaMetadata: true,
          },
        },
      },
    });
    if (!place) throw new NotFoundException('地点不存在');
    return this.formatAdmin(place);
  }

  async create(dto: CreatePlaceDto) {
    const coordinate = toWgs84(
      dto.longitude,
      dto.latitude,
      dto.coordinateSystem || 'wgs84',
    );
    await this.assertNoDuplicate(dto.name, coordinate);
    const slug = await this.uniqueSlug(dto.slug || dto.name);
    const place = await this.prisma.place.create({
      data: {
        name: dto.name.trim(),
        slug,
        address: dto.address?.trim() || null,
        city: dto.city?.trim() || null,
        province: dto.province?.trim() || null,
        country: dto.country?.trim() || null,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        type: dto.type || 'poi',
        coverMediaId: dto.coverMediaId || null,
      },
      include: { _count: { select: { moments: true } } },
    });
    this.memoryGraph?.scheduleRebuild();
    return this.formatAdmin(place);
  }

  async resolve(dto: CreatePlaceDto) {
    const coordinate = toWgs84(
      dto.longitude,
      dto.latitude,
      dto.coordinateSystem || 'wgs84',
    );
    const existing = await this.findDuplicate(dto.name, coordinate);
    if (existing) {
      const place = await this.prisma.place.update({
        where: { id: existing.id },
        data: {
          ...(!existing.address && dto.address
            ? { address: dto.address.trim() }
            : {}),
          ...(!existing.city && dto.city ? { city: dto.city.trim() } : {}),
          ...(!existing.province && dto.province
            ? { province: dto.province.trim() }
            : {}),
          ...(!existing.country && dto.country
            ? { country: dto.country.trim() }
            : {}),
        },
        include: { _count: { select: { moments: true } } },
      });
      return this.formatAdmin(place);
    }
    return this.create({
      ...dto,
      coordinateSystem: dto.coordinateSystem || 'wgs84',
    });
  }

  async update(id: string, dto: UpdatePlaceDto) {
    const existing = await this.prisma.place.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('地点不存在');
    if ((dto.longitude === undefined) !== (dto.latitude === undefined)) {
      throw new BadRequestException('更新坐标时必须同时提供经度和纬度');
    }
    const coordinate =
      dto.longitude !== undefined && dto.latitude !== undefined
        ? toWgs84(dto.longitude, dto.latitude, dto.coordinateSystem || 'wgs84')
        : { longitude: existing.longitude, latitude: existing.latitude };
    if (dto.name || dto.longitude !== undefined) {
      await this.assertNoDuplicate(
        dto.name || existing.name,
        coordinate,
        existing.id,
      );
    }
    const place = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.place.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.slug !== undefined
            ? { slug: await this.uniqueSlug(dto.slug, id) }
            : {}),
          ...(dto.address !== undefined
            ? { address: dto.address?.trim() || null }
            : {}),
          ...(dto.city !== undefined ? { city: dto.city?.trim() || null } : {}),
          ...(dto.province !== undefined
            ? { province: dto.province?.trim() || null }
            : {}),
          ...(dto.country !== undefined
            ? { country: dto.country?.trim() || null }
            : {}),
          ...(dto.longitude !== undefined ? coordinate : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.coverMediaId !== undefined
            ? { coverMediaId: dto.coverMediaId || null }
            : {}),
        },
        include: { _count: { select: { moments: true } } },
      });
      await tx.moment.updateMany({
        where: { placeId: id, status: 'published' },
        data: { needsPublish: true },
      });
      return updated;
    });
    this.memoryGraph?.scheduleRebuild();
    return this.formatAdmin(place);
  }

  async remove(id: string) {
    const place = await this.prisma.place.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            moments: true,
            albums: true,
            albumItems: true,
            confirmedMediaMetadata: true,
          },
        },
      },
    });
    if (!place) throw new NotFoundException('地点不存在');
    const referenceCount =
      place._count.moments +
      place._count.albums +
      place._count.albumItems +
      place._count.confirmedMediaMetadata;
    if (referenceCount > 0) {
      throw new ConflictException(
        `该地点仍被 ${referenceCount} 条内容或照片引用，请先迁移引用`,
      );
    }
    await this.prisma.place.delete({ where: { id } });
    this.memoryGraph?.scheduleRebuild();
  }

  async searchProvider(query: ProviderSearchQueryDto) {
    const payload = await this.amapRequest('/v3/place/text', {
      keywords: query.keywords,
      city: query.city || '全国',
      citylimit: query.city ? 'true' : 'false',
      offset: String(query.limit ?? 10),
      page: '1',
      extensions: 'all',
    });
    const pois = Array.isArray(payload.pois) ? payload.pois : [];
    return pois.flatMap((poi: any) => {
      const location = this.parseProviderLocation(poi.location);
      if (!location) return [];
      return [
        {
          providerId: String(poi.id || ''),
          name: String(poi.name || ''),
          address: this.providerText(poi.address),
          city: this.providerText(poi.cityname),
          province: this.providerText(poi.pname),
          country: '中国',
          type: 'poi',
          mapLocation: location,
        },
      ];
    });
  }

  async reverseProvider(query: ProviderReverseQueryDto) {
    const providerCoordinate =
      query.coordinateSystem === 'wgs84'
        ? toGcj02(query.longitude, query.latitude)
        : { longitude: query.longitude, latitude: query.latitude };
    const payload = await this.amapRequest('/v3/geocode/regeo', {
      location: `${providerCoordinate.longitude},${providerCoordinate.latitude}`,
      extensions: 'base',
      radius: '1000',
    });
    const regeocode = payload.regeocode || {};
    const component = regeocode.addressComponent || {};
    const neighborhood = this.providerText(component.neighborhood?.name);
    const township = this.providerText(component.township);
    return {
      name:
        neighborhood ||
        township ||
        this.providerText(regeocode.formatted_address) ||
        '地图选点',
      address: this.providerText(regeocode.formatted_address),
      city:
        this.providerText(component.city) ||
        this.providerText(component.district),
      province: this.providerText(component.province),
      country: this.providerText(component.country) || '中国',
      type: 'poi',
      mapLocation: providerCoordinate,
    };
  }

  private async assertNoDuplicate(
    name: string,
    coordinate: { longitude: number; latitude: number },
    excludeId?: string,
  ) {
    const duplicate = await this.findDuplicate(name, coordinate, excludeId);
    if (duplicate) {
      throw new ConflictException(
        `可能与已有地点「${duplicate.name}」重复，请直接选择已有地点`,
      );
    }
  }

  private async findDuplicate(
    name: string,
    coordinate: { longitude: number; latitude: number },
    excludeId?: string,
  ) {
    const candidates = await this.prisma.place.findMany({
      where: {
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: [
          { name: { equals: name.trim(), mode: 'insensitive' } },
          {
            latitude: {
              gte: coordinate.latitude - 0.002,
              lte: coordinate.latitude + 0.002,
            },
            longitude: {
              gte: coordinate.longitude - 0.002,
              lte: coordinate.longitude + 0.002,
            },
          },
        ],
      },
      take: 10,
    });
    return candidates.find(
      (place) =>
        place.name.trim().toLocaleLowerCase() ===
          name.trim().toLocaleLowerCase() ||
        distanceInMeters(place, coordinate) <= 100,
    );
  }

  private formatAdmin(place: any) {
    return {
      ...place,
      momentCount: place._count?.moments ?? 0,
      mapLocation: toGcj02(place.longitude, place.latitude),
    };
  }

  private normalizeSlug(raw: string) {
    const base = String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120);
    return base || `place-${Date.now().toString(36)}`;
  }

  private async uniqueSlug(raw: string, excludeId?: string) {
    const base = this.normalizeSlug(raw);
    let slug = base;
    let suffix = 2;
    while (true) {
      const existing = await this.prisma.place.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base.slice(0, 110)}-${suffix++}`;
    }
  }

  private async amapRequest(path: string, params: Record<string, string>) {
    const key = String(process.env.AMAP_WEB_SERVICE_KEY || '').trim();
    if (!key)
      throw new ServiceUnavailableException('高德 Web 服务 Key 尚未配置');
    const query = new URLSearchParams({ ...params, key });
    let response: Response;
    try {
      response = await fetch(
        `https://restapi.amap.com${path}?${query.toString()}`,
      );
    } catch {
      throw new ServiceUnavailableException('暂时无法连接高德地点服务');
    }
    const payload = await response.json();
    if (!response.ok || payload.status !== '1') {
      throw new ServiceUnavailableException(
        payload.info || '高德地点服务返回异常',
      );
    }
    return payload;
  }

  private parseProviderLocation(raw: unknown) {
    const [longitude, latitude] = String(raw || '')
      .split(',')
      .map(Number);
    return Number.isFinite(longitude) && Number.isFinite(latitude)
      ? { longitude, latitude }
      : null;
  }

  private providerText(raw: unknown) {
    if (Array.isArray(raw)) return raw.map(String).join('');
    return typeof raw === 'string' ? raw : '';
  }
}
