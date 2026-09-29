import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authenticate = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
    })
      .useMocker((token) =>
        token === AuthService ? { authenticate } : { get: jest.fn() },
      )
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns the token field consumed by the password login UI', async () => {
    authenticate.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
    });
    const response = { cookie: jest.fn(), json: jest.fn() };
    await controller.login(
      {} as any,
      { email: 'test@example.com', password: 'test' },
      response as any,
    );
    expect(response.json).toHaveBeenCalledWith({
      accessToken: 'access',
      access_token: 'access',
    });
  });
});
