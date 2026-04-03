require('dotenv').config();

const http = require('http');
const app = require('./app');
const { connectDatabase } = require('./shared/config/database');
const { connectRedis } = require('./shared/config/redis');
const { initializeSocket } = require('./shared/config/socket');
const { initializeQueue, startWorker, setupBullBoard } = require('./modules/queue');
const { processImageGeneration } = require('./modules/queue/workers/image-generation.worker');
const logger = require('./shared/utils/logger');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Track open connections so we can destroy them on shutdown
const openConnections = new Set();
server.on('connection', (socket) => {
  openConnections.add(socket);
  socket.once('close', () => openConnections.delete(socket));
});

initializeSocket(server);

const startServer = async () => {
  try {
    await connectDatabase();
    logger.info('MongoDB connected successfully');

    await connectRedis();
    logger.info('Redis connected successfully');

    initializeQueue();
    logger.info('Image generation queue initialized');

    setupBullBoard(app);

    startWorker(processImageGeneration);
    logger.info('Image generation worker started');

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received - shutting down gracefully`);

  const forceExit = setTimeout(() => {
    logger.warn('Shutdown timeout — forcing exit');
    process.exit(1);
  }, 5000);
  forceExit.unref();

  const { closeQueue } = require('./modules/queue');
  await closeQueue();

  for (const socket of openConnections) socket.destroy();

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer();
