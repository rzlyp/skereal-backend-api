const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

const createRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
};

const connectRedis = async () => {
  return new Promise((resolve, reject) => {
    redisClient = createRedisConnection();

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
      resolve(redisClient);
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
      reject(err);
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });
  });
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis,
  createRedisConnection
};
