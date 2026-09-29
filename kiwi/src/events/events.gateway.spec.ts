import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from './events.gateway';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [EventsGateway],
    }).compile();
    gateway = module.get<EventsGateway>(EventsGateway);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should emit "pong" on "ping"', () => {
    expect(
      gateway.handleMessage({ id: 'test-client' }, 'Hello world!'),
    ).toEqual({
      event: 'pong',
      data: 'Hello world!',
    });
  });
});
