import Redis from 'ioredis'

const getRedisClient = () => {
  const url = process.env.REDIS_URL
  if (!url) throw new Error('REDIS_URL environment variable is not set')
  return new Redis(url)
}

export const redis = getRedisClient()
