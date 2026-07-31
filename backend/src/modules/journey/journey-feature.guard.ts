import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class JourneyFeatureGuard implements CanActivate {
  canActivate() {
    const value = String(process.env.FEATURE_STORIES_ENABLED ?? 'false')
      .trim()
      .toLowerCase();
    if (!['1', 'true', 'yes', 'on'].includes(value))
      throw new NotFoundException();
    return true;
  }
}
