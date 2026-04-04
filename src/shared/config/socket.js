const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
      logger.info(`Socket ${socket.id} joined room user:${userId}`);
    });

    socket.on('join:project', (projectId) => {
      socket.join(`project:${projectId}`);
      logger.info(`Socket ${socket.id} joined room project:${projectId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

const emitGenerationStatus = (userId, data) => {
  if (io) {
    io.to(`user:${userId}`).emit('generation:status', data);
  }
};

const emitGenerationComplete = (userId, data) => {
  if (io) {
    io.to(`user:${userId}`).emit('generation:complete', data);
  }
};

const emitGenerationError = (userId, data) => {
  if (io) {
    io.to(`user:${userId}`).emit('generation:error', data);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitGenerationStatus,
  emitGenerationComplete,
  emitGenerationError
};
