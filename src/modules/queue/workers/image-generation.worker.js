const { generateImageFromSketch } = require('../../project/services/gemini.service');
const { updateVersion } = require('../../project/services/project.service');
const { saveGeneratedImage } = require('../../../shared/utils/upload');
const {
  emitGenerationStatus,
  emitGenerationComplete,
  emitGenerationError
} = require('../../../shared/config/socket');
const logger = require('../../../shared/utils/logger');

const processImageGeneration = async (job) => {
  const { versionId, projectId, userId, sketchPath, prompt } = job.data;
  const startTime = Date.now();

  logger.info(`Processing job ${job.id} for version ${versionId}`);

  try {
    await updateVersion(versionId, { status: 'processing' });

    emitGenerationStatus(userId, {
      versionId,
      status: 'processing',
      progress: 10
    });

    emitGenerationStatus(userId, {
      versionId,
      status: 'processing',
      progress: 30,
      message: 'Generating image...'
    });

    const result = await generateImageFromSketch(sketchPath, prompt);

    emitGenerationStatus(userId, {
      versionId,
      status: 'processing',
      progress: 70,
      message: 'Saving image...'
    });

    const imageBuffer = Buffer.from(result.imageData, 'base64');

    const afterImage = await saveGeneratedImage(
      imageBuffer,
      userId,
      projectId,
      versionId
    );

    const processingTime = Date.now() - startTime;

    await updateVersion(versionId, {
      status: 'completed',
      afterImage,
      processingTime
    });

    emitGenerationComplete(userId, {
      versionId,
      afterImage,
      processingTime
    });

    logger.info(`Job ${job.id} completed in ${processingTime}ms`);

    return {
      versionId,
      afterImage,
      processingTime
    };
  } catch (error) {
    logger.error(`Job ${job.id} failed:`, error);

    await updateVersion(versionId, {
      status: 'failed',
      errorMessage: error.message
    });

    emitGenerationError(userId, {
      versionId,
      error: error.message
    });

    throw error;
  }
};

module.exports = {
  processImageGeneration
};
