import { AuthController } from './auth.controller';

describe('AuthController login verification', () => {
  it('does not request GeeTest for email-code login', async () => {
    const auth = {
      login: jest.fn().mockResolvedValue({ access_token: 'token' }),
    };
    const geetest = { verify: jest.fn(), isEnabled: () => true };
    const controller = new AuthController(auth as any, geetest as any);

    await controller.login(
      { email: 'user@example.com', code: '1234' },
      { ip: '127.0.0.1' },
    );

    expect(geetest.verify).not.toHaveBeenCalled();
    expect(auth.login).toHaveBeenCalled();
  });

  it('keeps GeeTest verification for password login', async () => {
    const auth = {
      login: jest.fn().mockResolvedValue({ access_token: 'token' }),
    };
    const geetest = { verify: jest.fn().mockResolvedValue(undefined), isEnabled: () => true };
    const controller = new AuthController(auth as any, geetest as any);

    await controller.login(
      {
        email: 'user@example.com',
        password: 'secret12',
        geetestToken: 'verified',
      },
      { ip: '127.0.0.1' },
    );

    expect(geetest.verify).toHaveBeenCalledWith('verified', '127.0.0.1');
  });

  it('rejects password login without token when GeeTest is enabled', async () => {
    const auth = { login: jest.fn() };
    const geetest = { verify: jest.fn(), isEnabled: () => true };
    const controller = new AuthController(auth as any, geetest as any);

    await expect(
      controller.login(
        { email: 'user@example.com', password: 'secret12' },
        { ip: '127.0.0.1' },
      ),
    ).rejects.toThrow('请完成人机验证');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('allows missing token when GeeTest is disabled (development)', async () => {
    const auth = {
      login: jest.fn().mockResolvedValue({ access_token: 'token' }),
    };
    const geetest = { verify: jest.fn(), isEnabled: () => false };
    const controller = new AuthController(auth as any, geetest as any);

    await controller.login(
      { email: 'user@example.com', password: 'secret12' },
      { ip: '127.0.0.1' },
    );

    expect(geetest.verify).not.toHaveBeenCalled();
    expect(auth.login).toHaveBeenCalled();
  });
});
