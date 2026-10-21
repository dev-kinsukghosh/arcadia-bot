const express = require('express');
const devRoutes = require('./devRoutes.js');
const currencyRoutes = require('./currencyRoutes.js');
const townyRoutes = require('./townyRoutes.js');
const eventsRoutes = require('./eventsRoutes.js');
const warsRoutes = require('./warsRoutes.js');
const playersRoutes = require('./playersRoutes.js');
const shopsRoutes = require('./shopsRoutes.js');
const assetRoutes = require('./assetRoutes.js');
const {
  isMaintenanceActive,
  getMaintenanceReason,
  getMaintenanceDetails,
  isDevRequest,
  generateMaintenanceHtml,
} = require('../utils/maintenanceHelper.js');

const apiRouter = express.Router();

const getApiInfo = (req, res) => {
  res.json({
    name: 'ArcadiaMC Community Currency API',
    status: 'online',
    version: '1.2.0',
    endpoints: {
      status: '/status',
      currencies: '/currencies',
      stats: '/currencies/stats',
      history: '/currencies/history',
      towny: '/towny',
      devTelemetry: '/dev/telemetry',
      devLogs: '/dev/logs',
    },
  });
};

const getStatus = (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

const getMaintenanceStatus = (req, res) => {
  const active = isMaintenanceActive();
  const reason = getMaintenanceReason();

  return res.status(active ? 403 : 200).json({
    maintenance: active,
    status: active ? 'maintenance' : 'operational',
    reason: reason || undefined,
  });
};

// 0. Base API info & status routes
apiRouter.get('/', getApiInfo);
apiRouter.get('/api', getApiInfo);
apiRouter.get('/status', getStatus);
apiRouter.get('/api/status', getStatus);
apiRouter.get('/api/maintenance', getMaintenanceStatus);

// Mount Developer Telemetry & Admin Routes
apiRouter.use('/dev', devRoutes);
apiRouter.use('/api/dev', devRoutes);

// Mount Domain Specific Routers (available with and without /api prefix)
apiRouter.use('/currencies', currencyRoutes);
apiRouter.use('/api/currencies', currencyRoutes);

apiRouter.use('/towny', townyRoutes);
apiRouter.use('/api/towny', townyRoutes);

apiRouter.use('/events', eventsRoutes);
apiRouter.use('/api/events', eventsRoutes);

apiRouter.use('/wars', warsRoutes);
apiRouter.use('/api/wars', warsRoutes);

apiRouter.use('/players', playersRoutes);
apiRouter.use('/api/players', playersRoutes);

apiRouter.use('/shops', shopsRoutes);
apiRouter.use('/api/shops', shopsRoutes);

// Mount Static & Avatar Media Assets
apiRouter.use(assetRoutes);
apiRouter.use('/api', assetRoutes);

module.exports = {
  apiRouter,
};
