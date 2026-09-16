import { AuthController } from './auth.controller';

describe('AuthController login verification', () => {
  it('does not request Turnstile again for email-code login', async () => {
    const auth = {
      login: jest.fn().mockResolvedValue({ access_token: 'token' }),
    };
    const turnstile = { verify: jest.fn() };
    const controller = new AuthController(auth as any, turnstile as any);

    await controller.login(
      { email: 'user@example.com', code: '123456' },
      { ip: '127.0.0.1' },
    );

    expect(turnstile.verify).not.toHaveBeenCalled();
    expect(auth.login).toHaveBeenCalled();
  });

  it('keeps Turnstile verification for password login', async () => {
    const auth = {
      login: jest.fn().mockResolvedValue({ access_token: 'token' }),
    };
    const turnstile = { verify: jest.fn().mockResolvedValue(undefined) };
    const controller = new AuthController(auth as any, turnstile as any);

    await controller.login(
      {
        email: 'user@example.com',
        password: 'secret12',
        turnstileToken: 'verified',
      },
      { ip: '127.0.0.1' },
    );

    expect(turnstile.verify).toHaveBeenCalledWith('verified', '127.0.0.1');
  });
});
