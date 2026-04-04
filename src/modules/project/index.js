const projectRoutes = require('./routes/project.routes');
const Project = require('./models/project.model');
const Version = require('./models/version.model');
const projectService = require('./services/project.service');

module.exports = {
  projectRoutes,
  Project,
  Version,
  projectService,
};
