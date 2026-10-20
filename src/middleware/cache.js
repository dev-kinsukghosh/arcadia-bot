const redisClient = require('../utils/redis.js');
const { telemetry } = require('../utils/telemetry.js');

/**
 * Redis In-Memory API Cache & HTTP Cache-Control Middleware
 * @param {number} ttlSeconds - Cache TTL in seconds (defaults to 10s)
 */
function cacheEndpoint(ttlSeconds = 10) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    // Attach Cache-Control header for client/CDN browser caching
    res.setHeader(
      'Cache-Control',
      `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds * 2}, stale-while-revalidate=30`
    );

    const cacheKey = `api_cache:${req.originalUrl || req.url}`;
    if (redisClient && redisClient.status === 'ready') {
      try {
        const cachedResponse = await redisClient.get(cacheKey);
        if (cachedResponse) {
          telemetry.recordCacheHit();
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('Content-Type', 'application/json');
          return res.send(cachedResponse);
        }
      } catch {
        // Fallback to live route handling
      }
    }

    telemetry.recordCacheMiss();
    res.setHeader('X-Cache', 'MISS');

    const originalSend = res.send.bind(res);
    res.send = (body) => {
      if (
        res.statusCode === 200 &&
        redisClient &&
        redisClient.status === 'ready' &&
        typeof body === 'string'
      ) {
        redisClient.setex(cacheKey, ttlSeconds, body).catch(() => {});
      }
      return originalSend(body);
    };

    next();
  };
}

module.exports = {
  cacheEndpoint,
};
