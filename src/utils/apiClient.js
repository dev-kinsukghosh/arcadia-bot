const axios = require('axios');
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
    logger.system(
      `<-- [API] ${res.status} ${res.config.method?.toUpperCase()} ${res.config.url} (${duration}ms)`
    );
    return res.data;
  },
  (error) => {
    const duration = error.config?.meta?.startTime
      ? Date.now() - error.config.meta.startTime
      : null;
    const durationStr = duration ? ` (${duration}ms)` : '';

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

/**
 * ArcadiaMC API helper methods
 */
const arcadiaApi = {
  getShops: () => apiClient.get('/api/shops'),
  getCurrencies: () => apiClient.get('/api/currencies'),
  getConvoy: () => apiClient.get('/api/convoy'),
  getTowny: () => apiClient.get('/api/towny'),

  // Generic helper for other paths
  get: (url, params) => apiClient.get(url, { params }),
  post: (url, data) => apiClient.post(url, data),
};

module.exports = {
  apiClient,
  arcadiaApi,
};
