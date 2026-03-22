import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { config } from '../config/index.js';
import { Request } from 'express';

const redisClient = new Redis(config.redis.url);

redisClient.on('error', (err) => {
  console.error('Rate limit Redis error:', err);
});

export function createRedisStore(prefix: string) {
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
    prefix: `rl:${prefix}:`,
  });
}

/** Extract real client IP from X-Forwarded-For (set by Caddy), falling back to req.ip */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}
