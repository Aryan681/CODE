const redis = require('redis');
const logger = require('./logger');
const zlib = require('zlib');

// Redis configuration
const REDIS_CONFIG = {
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis max retries reached');
        return new Error('Redis max retries reached');
      }
      return Math.min(retries * 100, 3000);
    },
    connectTimeout: 10000,
  },
  retry_strategy: function(options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('Redis server refused connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Redis retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
};

// Create Redis client
const redisClient = redis.createClient(REDIS_CONFIG);

// Cache version
const CACHE_VERSION = 'v1';

// Compression functions
const compress = async (data) => {
  return new Promise((resolve, reject) => {
    zlib.gzip(JSON.stringify(data), (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

const decompress = async (data) => {
  return new Promise((resolve, reject) => {
    zlib.gunzip(data, (err, result) => {
      if (err) reject(err);
      else resolve(JSON.parse(result.toString()));
    });
  });
};

// Event handlers
redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redisClient.on('reconnecting', () => {
  logger.info('Redis client reconnecting...');
});

// Cache key generator
const generateCacheKey = (key) => `${CACHE_VERSION}:${key}`;

// Enhanced caching functions
redisClient.getWithCache = async (key, fetchFn, options = {}) => {
  const {
    ttl = 7200,
    compress = false,
    version = CACHE_VERSION,
    prefix = '',
  } = options;

  const cacheKey = generateCacheKey(`${prefix}${key}`);
  
  try {
    // Try to get cached data
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      logger.debug(`Cache hit for key: ${cacheKey}`);
      const data = options.compress ? await decompress(cachedData) : JSON.parse(cachedData);
      return data;
    }

    // Fetch fresh data if not in cache
    logger.debug(`Cache miss for key: ${cacheKey}`);
    const freshData = await fetchFn();
    
    // Store in cache with TTL
    const dataToStore = options.compress ? await compress(freshData) : JSON.stringify(freshData);
    await redisClient.setEx(cacheKey, ttl, dataToStore);
    
    return freshData;
  } catch (err) {
    logger.error('Redis cache error:', err);
    // Fallback to direct fetch if Redis fails
    return await fetchFn();
  }
};

// Cache invalidation
redisClient.invalidateCache = async (pattern) => {
  try {
    const keys = await redisClient.keys(generateCacheKey(pattern));
    if (keys.length > 0) {
      await Promise.all(keys.map(key => redisClient.del(key)));
      logger.info(`Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
    }
  } catch (err) {
    logger.error('Cache invalidation error:', err);
  }
};

// Cache warming
redisClient.warmCache = async (key, fetchFn, options = {}) => {
  try {
    const data = await fetchFn();
    const cacheKey = generateCacheKey(key);
    const dataToStore = options.compress ? await compress(data) : JSON.stringify(data);
    await redisClient.setEx(cacheKey, options.ttl || 7200, dataToStore);
    logger.info(`Cache warmed for key: ${key}`);
  } catch (err) {
    logger.error('Cache warming error:', err);
  }
};

// Performance monitoring
redisClient.getCacheStats = async () => {
  try {
    const info = await redisClient.info();
    return {
      connected_clients: info.connected_clients,
      used_memory: info.used_memory,
      total_connections_received: info.total_connections_received,
      total_commands_processed: info.total_commands_processed,
    };
  } catch (err) {
    logger.error('Failed to get cache stats:', err);
    return null;
  }
};

// Connect and export
(async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connection established');
  } catch (err) {
    logger.error('Failed to connect to Redis:', err);
  }
})();

module.exports = redisClient;  