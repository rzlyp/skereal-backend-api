const express = require('express');
const {
  createProject,
  getProjects,
  getProject,
  deleteProject,
  getProjectVersions,
  createVersion
} = require('../controllers/project.controller');

const { authenticate } = require('../../auth/middleware/auth.middleware');
const { uploadSketch } = require('../../../shared/utils/upload');
const { generationRateLimiter } = require('../../../shared/middleware/rate-limiter');
const router = express.Router();


router.use(authenticate);

router.get('/', getProjects);
router.post('/', generationRateLimiter, (req, res, next) => {
  uploadSketch.single('sketch')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, createProject);
router.get('/:id', getProject);
router.delete('/:id', deleteProject);

router.get('/:id/versions', getProjectVersions);
router.post('/:id/versions', generationRateLimiter, createVersion);

module.exports = router;
