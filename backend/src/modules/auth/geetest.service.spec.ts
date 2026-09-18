// backend/src/modules/auth/geetest.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { GeetestService } from './geetest.service';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

describe('GeetestService', () => {
  let service: GeetestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeetestService],
    }).compile();

    service = module.get<GeetestService>(GeetestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEnabled', () => {
    it('should remain disabled in production until credentials are configured', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.GEETEST_ENABLED;
      delete process.env.GEETEST_CAPTCHA_ID;
      delete process.env.GEETEST_CAPTCHA_KEY;
      expect(service.isEnabled()).toBe(false);
    });

    it('should enable automatically in production when credentials are configured', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.GEETEST_ENABLED;
      process.env.GEETEST_CAPTCHA_ID = 'test-id';
      process.env.GEETEST_CAPTCHA_KEY = 'test-key';
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when GEETEST_ENABLED is "false"', () => {
      process.env.GEETEST_ENABLED = 'false';
      expect(service.isEnabled()).toBe(false);
    });

    it('should return true when GEETEST_ENABLED is "true"', () => {
      process.env.GEETEST_ENABLED = 'true';
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('verify', () => {
    it('should throw BadRequestException when token is not valid JSON of four fields', async () => {
      process.env.GEETEST_ENABLED = 'true';
      process.env.GEETEST_CAPTCHA_ID = 'test-id';
      process.env.GEETEST_CAPTCHA_KEY = 'test-key';

      await expect(service.verify('not-a-json-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ServiceUnavailableException when credentials are missing', async () => {
      process.env.GEETEST_ENABLED = 'true';
      delete process.env.GEETEST_CAPTCHA_ID;
      delete process.env.GEETEST_CAPTCHA_KEY;

      const token = JSON.stringify({
        lot_number: 'lot123',
        captcha_output: 'output',
        pass_token: 'token',
        gen_time: 'time',
      });
      await expect(service.verify(token)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
