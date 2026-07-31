import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class MemoryGraphFeatureGuard implements CanActivate {
  canActivate() {
    const value = String(process.env.FEATURE_CONSTELLATION_ENABLED ?? 'false')
      .trim()
      .toLowerCase();
    if (!['1', 'true', 'yes', 'on'].includes(value))
      throw new NotFoundException();
    return true;
  }
}
