// backend/src/modules/auth/geetest.module.ts

import { Module } from '@nestjs/common';
import { GeetestService } from './geetest.service';

@Module({
  providers: [GeetestService],
  exports: [GeetestService],
})
export class GeetestModule {}
