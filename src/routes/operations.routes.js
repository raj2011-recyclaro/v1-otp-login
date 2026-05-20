const express = require('express');
const operationsController = require('../controllers/operations.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
  operationsPickupIdParams,
  listOperationsPickupsSchema,
  skipPickupSchema,
  adminTakeoverSchema,
  updateOperationsStatusSchema,
  listBuyersSchema
} = require('../validations/operations.validation');

const router = express.Router();

router.get(
  '/pickups',
  authMiddleware,
  authorizeRoles('admin', 'buyer'),
  validate(listOperationsPickupsSchema),
  asyncHandler(operationsController.listPickups)
);
router.get(
  '/pickups/:id',
  authMiddleware,
  authorizeRoles('admin', 'buyer'),
  validate(operationsPickupIdParams),
  asyncHandler(operationsController.getPickupById)
);
router.post(
  '/pickups/:id/accept',
  authMiddleware,
  authorizeRoles('buyer'),
  validate(operationsPickupIdParams),
  asyncHandler(operationsController.acceptPickup)
);
router.post(
  '/pickups/:id/skip',
  authMiddleware,
  authorizeRoles('buyer'),
  validate(skipPickupSchema),
  asyncHandler(operationsController.skipPickup)
);
router.post(
  '/pickups/:id/takeover',
  authMiddleware,
  authorizeRoles('admin'),
  validate(adminTakeoverSchema),
  asyncHandler(operationsController.startAdminTakeover)
);
router.patch(
  '/pickups/:id/status',
  authMiddleware,
  authorizeRoles('admin'),
  validate(updateOperationsStatusSchema),
  asyncHandler(operationsController.updatePickupStatus)
);
router.get(
  '/buyers',
  authMiddleware,
  authorizeRoles('admin'),
  validate(listBuyersSchema),
  asyncHandler(operationsController.listBuyers)
);

module.exports = router;
