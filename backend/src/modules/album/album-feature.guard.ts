import { CanActivate, Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class AlbumFeatureGuard implements CanActivate {
  canActivate() {
    const enabled = String(process.env.FEATURE_ALBUMS_ENABLED ?? 'true').trim().toLowerCase();
    if (!['1', 'true', 'yes', 'on'].includes(enabled)) {
      throw new ServiceUnavailableException('相册功能暂时关闭');
    }
    return true;
  }
}
