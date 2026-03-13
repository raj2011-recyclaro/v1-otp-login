const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate.middleware');
const {
  updateMyProfileSchema,
  createAddressSchema,
  addressIdParamSchema,
  updateAddressSchema
} = require('../validations/user.validation');

const router = express.Router();

router.get('/me', authMiddleware, asyncHandler(userController.getMe));
router.put(
  '/me',
  authMiddleware,
  validate(updateMyProfileSchema),
  asyncHandler(userController.updateMe)
);
router.post(
  '/me/addresses',
  authMiddleware,
  validate(createAddressSchema),
  asyncHandler(userController.createAddress)
);
router.get('/me/addresses', authMiddleware, asyncHandler(userController.listAddresses));
router.patch(
  '/me/addresses/:addressId',
  authMiddleware,
  validate(updateAddressSchema),
  asyncHandler(userController.updateAddress)
);
router.delete(
  '/me/addresses/:addressId',
  authMiddleware,
  validate(addressIdParamSchema),
  asyncHandler(userController.deleteAddress)
);

module.exports = router;
