import Redis from 'ioredis';
import { Injectable, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redisClient: Redis;

  constructor() {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || ''),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  async set(key: string, value: string, expiresIn?: number): Promise<'OK'> {
    if (expiresIn) {
      return await this.redisClient.set(key, value, 'EX', expiresIn);
    }
    return await this.redisClient.set(key, value);
  }

  async del(key: string): Promise<number> {
    return await this.redisClient.del(key);
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }
}
