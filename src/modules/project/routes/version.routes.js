const express = require('express');
const { getVersion } = require('../controllers/project.controller');
const { authenticate } = require('../../auth/middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/:id', getVersion);

module.exports = router;
