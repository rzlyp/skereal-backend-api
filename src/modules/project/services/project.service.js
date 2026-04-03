const Project = require('../models/project.model');
const { deleteProjectFiles } = require('../../../shared/utils/upload');
const logger = require('../../../shared/utils/logger');

const createProject = async ({ userId, name, originalImage }) => {
  const project = await Project.create({
    userId,
    name,
    originalImage,
    thumbnail: originalImage
  });

  logger.info(`Project created: ${project._id} by user ${userId}`);
  return project;
};

// Get all projects for a user
const getUserProjects = async (userId, { page = 1, limit = 12, status = 'active' }) => {
  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    Project.find({ userId, status })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('currentVersionId'),
    Project.countDocuments({ userId, status })
  ]);

  return {
    projects,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

const getProjectById = async (projectId, userId) => {
  const project = await Project.findOne({
    _id: projectId,
    userId
  }).populate('currentVersionId');

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  return project;
};


const updateProject = async (projectId, userId, updates) => {
  const project = await Project.findOneAndUpdate(
    { _id: projectId, userId },
    updates,
    { new: true }
  );

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  return project;
};

const deleteProject = async (projectId, userId) => {
  const project = await Project.findOne({ _id: projectId, userId });

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  await Project.deleteOne({ _id: projectId });

  await deleteProjectFiles(userId.toString(), projectId.toString(), project.originalImage);

  logger.info(`Project deleted: ${projectId}`);
  return true;
};


module.exports = {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject
};
