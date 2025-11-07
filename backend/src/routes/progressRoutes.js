'use strict';

const express = require('express');
const { HTTP_STATUS } = require('../config/constants');
const { config } = require('../config/config');
const { authenticate } = require('../middleware/auth');
const controller = require('../controllers/progressController');

const router = express.Router();

const requireAuth = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      return authenticate(req, res, next);
    }

    const fallbackId = req.headers['x-user-id'] || req.headers['X-User-Id'];

    if (fallbackId && config.nodeEnv !== 'production') {
      req.user = {
        ...(req.user || {}),
        id: fallbackId,
      };
      return next();
    }

    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required. Provide a Bearer token or X-User-Id header in development.',
      },
      data: null,
    });
  } catch (error) {
    return next(error);
  }
};

router.get('/', requireAuth, controller.listProgress);
router.put('/', requireAuth, controller.upsertProgress);
router.post('/sync', requireAuth, controller.syncProgress);

module.exports = router;

