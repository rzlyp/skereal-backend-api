const { Queue, Worker } = require('bullmq');
const { ExpressAdapter } = require('@bull-board/express');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { createRedisConnection } = require('../../shared/config/redis');
const logger = require('../../shared/utils/logger');

let imageGenerationQueue = null;
let imageGenerationWorker = null;

const QUEUE_NAME = 'image-generation';

const initializeQueue = () => {
  const connection = createRedisConnection();

  imageGenerationQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 1,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: {
        age: 600
      },
      removeOnFail: {
        age: 600
      }
    }
  });

  logger.info('Image generation queue initialized');

  return imageGenerationQueue;
};

const startWorker = (processJob) => {
  const connection = createRedisConnection();

  imageGenerationWorker = new Worker(QUEUE_NAME, processJob, {
    connection,
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 2
  });

  imageGenerationWorker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });

  imageGenerationWorker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed:`, err);
  });

  imageGenerationWorker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  logger.info('Image generation worker started');

  return imageGenerationWorker;
};

const getImageGenerationQueue = () => {
  if (!imageGenerationQueue) {
    return initializeQueue();
  }
  return imageGenerationQueue;
};

const closeQueue = async () => {
  if (imageGenerationWorker) {
    await imageGenerationWorker.close();
    imageGenerationWorker = null;
  }
  if (imageGenerationQueue) {
    await imageGenerationQueue.close();
    imageGenerationQueue = null;
  }
};

const setupBullBoard = (app) => {
  if (!imageGenerationQueue) {
    logger.warn('Queue not initialized — Bull Board skipped');
    return;
  }

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(imageGenerationQueue)],
    serverAdapter
  });

  if (process.env.NODE_ENV !== 'production') {
    app.use('/admin/queues', serverAdapter.getRouter());
    logger.info('Bull Board available at /admin/queues');
  }
};

module.exports = {
  initializeQueue,
  startWorker,
  getImageGenerationQueue,
  setupBullBoard,
  closeQueue,
  QUEUE_NAME
};
