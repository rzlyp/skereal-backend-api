const projectService = require('../services/project.service');
const { getImageGenerationQueue } = require('../../queue');
const { urlPathToAbsolute } = require('../../../shared/utils/upload');
const {validateFashionContext} = require('../services/gemini.service');
const logger = require('../../../shared/utils/logger');
const fs = require('fs');

const createProject = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ error: 'Sketch image is required' });
    }

    const imageBuffer = fs.readFileSync(req.file.path);
    const sketchBase64 = imageBuffer.toString('base64');

    await validateFashionContext(sketchBase64, prompt).then(({ valid, reason }) => {
      if (!valid) {
        throw new Error(`It looks like this image or prompt isn't related to fashion. To get the best results, please try uploading a sketch of a garment or an outfit.`);
      }
    })

    const originalImage = `/uploads/projects/${userId}/${req.file.filename}`;

    const project = await projectService.createProject({
      userId,
      originalImage
    });

    const version = await projectService.createVersion({
      projectId: project._id,
      beforeImage: originalImage,
      prompt
    });

    await projectService.updateProject(project._id, userId, {
      currentVersionId: version._id
    });

    const queue = getImageGenerationQueue();
    const job = await queue.add('generate-image', {
      versionId: version._id.toString(),
      projectId: project._id.toString(),
      userId: userId.toString(),
      sketchPath: req.file.path,
      prompt
    });

    await projectService.updateVersion(version._id, {
      jobId: job.id,
      status: 'pending'
    });

    logger.info(`Generation job created: ${job.id} for version ${version._id}`);

    res.status(201).json({
      project: {
        id: project._id,
        name: project.name,
        originalImage: project.originalImage
      },
      version: {
        id: version._id,
        status: version.status,
        jobId: job.id
      }
    });
  } catch (error) {
    next(error);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 12, status = 'active' } = req.query;

    const result = await projectService.getUserProjects(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const project = await projectService.getProjectById(id, userId);

    res.json({ project });
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    await projectService.deleteProject(id, userId);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getProjectVersions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify project ownership
    await projectService.getProjectById(id, userId);

    const versions = await projectService.getProjectVersions(id);

    res.json({ versions });
  } catch (error) {
    next(error);
  }
};

const createVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { prompt, beforeVersionId, slot = 'after' } = req.body;
    const userId = req.user._id;

    const project = await projectService.getProjectById(id, userId);

    let beforeImage = project.originalImage;
    let beforePrompt = null;

    if (beforeVersionId) {
      const beforeVersion = await projectService.getVersionById(beforeVersionId);
      const sourceImage = slot === 'before'
        ? beforeVersion.beforeImage
        : beforeVersion.afterImage;
      if (sourceImage) {
        beforeImage = sourceImage;
        beforePrompt = beforeVersion.prompt;
      }
    }

    const version = await projectService.createVersion({
      projectId: id,
      beforeImage,
      beforePrompt,
      prompt
    });

    const queue = getImageGenerationQueue();
    const job = await queue.add('generate-image', {
      versionId: version._id.toString(),
      projectId: id,
      userId: userId.toString(),
      sketchPath: urlPathToAbsolute(beforeImage),
      prompt
    });

    await projectService.updateVersion(version._id, {
      jobId: job.id
    });

    await projectService.updateProject(id, userId, {
      currentVersionId: version._id
    });

    logger.info(`Regeneration job created: ${job.id} for version ${version._id}`);

    res.status(201).json({
      version: {
        id: version._id,
        status: version.status,
        jobId: job.id
      }
    });
  } catch (error) {
    next(error);
  }
};

const getVersion = async (req, res, next) => {
  try {
    const { id } = req.params;

    const version = await projectService.getVersionById(id);

    res.json({ version });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  deleteProject,
  getProjectVersions,
  createVersion,
  getVersion
};
