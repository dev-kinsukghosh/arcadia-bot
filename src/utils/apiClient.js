const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const CircuitBreaker = require('opossum');
const { z } = require('zod');
const { config } = require('../config.js');
const logger = require('./logger.js');

const apiClient = axios.create({
  baseURL: config.api.baseUrl,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'User-Agent': 'Arcadia-Community-Bot/1.0.0 (Discord Bot)',
  },
});

// Configure automatic retries with exponential backoff on network failures
axiosRetry(apiClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  onRetry: (retryCount, error) => {
    logger.warn(
      `API request failed: ${error.message}. Retrying request (Attempt #${retryCount})...`
    );
  },
});

// Request interceptor to log outgoing requests and track time
apiClient.interceptors.request.use((req) => {
  req.meta = req.meta || {};
  req.meta.startTime = Date.now();
  logger.system(`--> [API] ${req.method?.toUpperCase()} ${req.url}`);
  return req;
});

// Response interceptor to log incoming responses and errors
apiClient.interceptors.response.use(
  (res) => {
    const duration = Date.now() - res.config.meta.startTime;
    try {
      const { telemetry } = require('./telemetry.js');
      telemetry.recordExternalApiCall({
        method: res.config.method?.toUpperCase() || 'GET',
        url: res.config.url || '',
        status: res.status,
        durationMs: duration,
        success: true,
      });
    } catch {
      // Ignore telemetry errors
    }

    logger.system(
      `<-- [API] ${res.status} ${res.config.method?.toUpperCase()} ${res.config.url} (${duration}ms)`
    );
    return res.data;
  },
  (error) => {
    const duration = error.config?.meta?.startTime
      ? Date.now() - error.config.meta.startTime
      : 0;
    const durationStr = duration ? ` (${duration}ms)` : '';

    try {
      const { telemetry } = require('./telemetry.js');
      telemetry.recordExternalApiCall({
        method: error.config?.method?.toUpperCase() || 'GET',
        url: error.config?.url || '',
        status: error.response?.status || 500,
        durationMs: duration,
        success: false,
        error: error.message,
      });
    } catch {
      // Ignore telemetry errors
    }

    if (error.response) {
      logger.error(
        `[API ERROR] ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}${durationStr} - ${JSON.stringify(error.response.data)}`
      );
    } else if (error.request) {
      logger.error(
        `[API TIMEOUT/NETWORK] ${error.config?.method?.toUpperCase()} ${error.config?.url}${durationStr} - No response received`
      );
    } else {
      logger.error(`[API SETUP ERROR] ${error.message}`);
    }

    return Promise.reject(error);
  }
);


// Opossum Circuit Breaker setup
const breakerOptions = {
  timeout: 12000, // 12s timeout
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30s reset
};

const apiBreaker = new CircuitBreaker(async (url) => {
  return apiClient.get(url);
}, breakerOptions);

apiBreaker.on('open', () =>
  logger.warn('[API CIRCUIT BREAKER OPEN] API failing, serving fallback cache.')
);
apiBreaker.on('halfOpen', () =>
  logger.info('[API CIRCUIT BREAKER HALF-OPEN] Testing API endpoint health.')
);
apiBreaker.on('close', () =>
  logger.info('[API CIRCUIT BREAKER CLOSED] External API connection restored.')
);

// Zod Schema for API payload validation
const apiResponseSchema = z.object({
  updatedAt: z.number().optional(),
});

/**
 * Safely execute API call through Circuit Breaker and validate payload with Zod
 */
async function safeApiGet(path) {
  try {
    const data = await apiBreaker.fire(path);
    if (data && typeof data === 'object') {
      apiResponseSchema.safeParse(data);
    }
    return data;
  } catch {
    return apiClient.get(path);
  }
}

/**
 * ArcadiaMC API helper methods
 */
const arcadiaApi = {
  getShops: () => safeApiGet('/api/shops'),
  getCurrencies: () => safeApiGet('/api/currencies'),
  getConvoy: () => safeApiGet('/api/convoy'),
  getTowny: () => safeApiGet('/api/towny'),
  getEvents: () => safeApiGet('/api/events'),
  getWars: () => safeApiGet('/api/wars'),
  getPlayers: () => safeApiGet('/api/players'),
  getChat: () => safeApiGet('/api/chat'),

  // Generic helper for other paths
  get: (url, params) => apiClient.get(url, { params }),
  post: (url, data) => apiClient.post(url, data),
};

module.exports = {
  apiClient,
  arcadiaApi,
  apiBreaker,
  apiResponseSchema,
};
