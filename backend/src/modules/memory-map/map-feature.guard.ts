import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

@Injectable()
export class MapFeatureGuard implements CanActivate {
  canActivate() {
    const enabled = String(process.env.FEATURE_MAP_ENABLED ?? 'true')
      .trim()
      .toLowerCase();
    if (!['1', 'true', 'yes', 'on'].includes(enabled)) {
      throw new ServiceUnavailableException('地图功能暂时关闭');
    }
    return true;
  }
}
