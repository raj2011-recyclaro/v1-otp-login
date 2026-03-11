const express = require('express');
const authController = require('../controllers/auth.controller');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate.middleware');
const otpRateLimit = require('../middlewares/rateLimit.middleware');
const {
  firebaseLoginSchema,
  refreshTokenSchema
} = require('../validations/auth.validation');

const router = express.Router();

router.post(
  '/firebase-login',
  otpRateLimit,
  validate(firebaseLoginSchema),
  asyncHandler(authController.firebaseLogin)
);

router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  asyncHandler(authController.refreshToken)
);

module.exports = router;
