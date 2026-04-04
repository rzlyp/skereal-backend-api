const express = require('express');
const { authenticate } = require('../../auth/middleware/auth.middleware');
const { getVersionById } = require('../../project/services/project.service');

const router = express.Router();

router.use(authenticate);

router.get('/versions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const version = await getVersionById(id);
    res.json({ version });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
