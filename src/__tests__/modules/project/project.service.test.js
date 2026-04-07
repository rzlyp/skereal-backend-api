'use strict';

jest.mock('../../../modules/project/models/project.model');
jest.mock('../../../modules/project/models/version.model');
jest.mock('../../../shared/utils/upload');
jest.mock('../../../shared/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const Project = require('../../../modules/project/models/project.model');
const Version = require('../../../modules/project/models/version.model');
const { deleteProjectFiles } = require('../../../shared/utils/upload');
const projectService = require('../../../modules/project/services/project.service');

const userId = 'user-001';
const projectId = 'proj-001';
const versionId = 'ver-001';

describe('createProject', () => {
  it('creates and returns a project', async () => {
    const project = { _id: projectId, userId, originalImage: '/uploads/sketch.jpg' };
    Project.create.mockResolvedValue(project);

    const result = await projectService.createProject({
      userId,
      originalImage: '/uploads/sketch.jpg'
    });

    expect(Project.create).toHaveBeenCalled();
    expect(result).toBe(project);
  });
});

describe('getProjectById', () => {
  it('returns the project when found', async () => {
    const project = { _id: projectId };
    Project.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(project) });

    const result = await projectService.getProjectById(projectId, userId);

    expect(result).toBe(project);
  });

  it('throws 404 error when not found', async () => {
    Project.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

    await expect(projectService.getProjectById(projectId, userId)).rejects.toMatchObject({
      message: 'Project not found',
      statusCode: 404
    });
  });
});

describe('updateProject', () => {
  it('returns updated project when found', async () => {
    const updated = { _id: projectId, status: 'archived' };
    Project.findOneAndUpdate.mockResolvedValue(updated);

    const result = await projectService.updateProject(projectId, userId, { status: 'archived' });

    expect(result).toBe(updated);
  });

  it('throws 404 error when project not found', async () => {
    Project.findOneAndUpdate.mockResolvedValue(null);

    await expect(projectService.updateProject(projectId, userId, {})).rejects.toMatchObject({
      statusCode: 404
    });
  });
});

describe('deleteProject', () => {
  it('deletes project, versions and files', async () => {
    const project = { _id: projectId, originalImage: '/uploads/sketch.jpg', toString: () => projectId };
    Project.findOne.mockResolvedValue(project);
    Version.deleteMany.mockResolvedValue({});
    Project.deleteOne.mockResolvedValue({});
    deleteProjectFiles.mockResolvedValue();

    const result = await projectService.deleteProject(projectId, userId);

    expect(Version.deleteMany).toHaveBeenCalledWith({ projectId });
    expect(Project.deleteOne).toHaveBeenCalledWith({ _id: projectId });
    expect(deleteProjectFiles).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('throws 404 when project not found', async () => {
    Project.findOne.mockResolvedValue(null);

    await expect(projectService.deleteProject(projectId, userId)).rejects.toMatchObject({
      statusCode: 404
    });
  });
});

describe('createVersion', () => {
  it('creates and returns a version', async () => {
    const version = { _id: versionId, projectId, status: 'pending' };
    Version.create.mockResolvedValue(version);

    const result = await projectService.createVersion({
      projectId,
      beforeImage: '/uploads/sketch.jpg',
      prompt: 'silk gown'
    });

    expect(Version.create).toHaveBeenCalled();
    expect(result).toBe(version);
  });
});

describe('getVersionById', () => {
  it('returns the version when found', async () => {
    const version = { _id: versionId };
    Version.findById.mockResolvedValue(version);

    const result = await projectService.getVersionById(versionId);

    expect(result).toBe(version);
  });

  it('throws 404 when version not found', async () => {
    Version.findById.mockResolvedValue(null);

    await expect(projectService.getVersionById(versionId)).rejects.toMatchObject({
      statusCode: 404
    });
  });
});

describe('getProjectVersions', () => {
  it('returns versions sorted by createdAt desc', async () => {
    const versions = [{ _id: 'v2' }, { _id: 'v1' }];
    Version.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(versions) });

    const result = await projectService.getProjectVersions(projectId);

    expect(Version.find).toHaveBeenCalledWith({ projectId });
    expect(result).toBe(versions);
  });
});
