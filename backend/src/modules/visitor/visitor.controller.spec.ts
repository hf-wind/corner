import { BadRequestException } from '@nestjs/common';
import { VisitorController } from './visitor.controller';

describe('VisitorController', () => {
  const request = { ip: '203.0.113.8' };
  const dto = {
    nickname: '旅人',
    email: 'traveler@example.com',
    turnstileToken: 'verified-token',
  };

  it('verifies Turnstile before identifying a temporary visitor', async () => {
    const visitorService = {
      resolveVisitorId: jest.fn().mockReturnValue('hashed-visitor-id'),
      identify: jest.fn().mockResolvedValue({ nickname: dto.nickname }),
    };
    const turnstile = { verify: jest.fn().mockResolvedValue(undefined) };
    const controller = new VisitorController(
      visitorService as any,
      turnstile as any,
    );

    await expect(
      controller.identify(request, 'visitor-id', dto),
    ).resolves.toEqual({ nickname: dto.nickname });

    expect(turnstile.verify).toHaveBeenCalledWith(dto.turnstileToken, request.ip);
    expect(turnstile.verify.mock.invocationCallOrder[0]).toBeLessThan(
      visitorService.identify.mock.invocationCallOrder[0],
    );
    expect(visitorService.identify).toHaveBeenCalledWith(
      { headers: { 'x-visitor-id': 'visitor-id' }, ip: request.ip },
      'hashed-visitor-id',
      dto.nickname,
      dto.email,
    );
  });

  it('does not identify the visitor when Turnstile rejects the request', async () => {
    const visitorService = {
      resolveVisitorId: jest.fn(),
      identify: jest.fn(),
    };
    const turnstile = {
      verify: jest.fn().mockRejectedValue(new BadRequestException('请完成人机验证')),
    };
    const controller = new VisitorController(
      visitorService as any,
      turnstile as any,
    );

    await expect(
      controller.identify(request, 'visitor-id', {
        nickname: dto.nickname,
        turnstileToken: undefined,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(visitorService.resolveVisitorId).not.toHaveBeenCalled();
    expect(visitorService.identify).not.toHaveBeenCalled();
  });
});
