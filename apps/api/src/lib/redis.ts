import { Redis } from 'ioredis'

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379'
    _redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })

    _redis.on('error', (err: Error) => {
      // Cache Redis não é fonte de verdade (D-12) — logar e seguir
      console.error('[Redis] connection error:', err.message)
    })
  }

  return _redis
}
