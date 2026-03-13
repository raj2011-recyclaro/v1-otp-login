const express = require('express');
const pickupController = require('../controllers/pickup.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
  createPickupSchema,
  listPickupsSchema,
  pickupIdParamSchema,
  cancelPickupSchema,
  rebookPickupSchema,
  ratePickupSchema
} = require('../validations/pickup.validation');

const router = express.Router();

router.post(
  '/',
  authMiddleware,
  validate(createPickupSchema),
  asyncHandler(pickupController.createPickup)
);
router.get(
  '/',
  authMiddleware,
  validate(listPickupsSchema),
  asyncHandler(pickupController.listPickups)
);
router.get(
  '/:id',
  authMiddleware,
  validate(pickupIdParamSchema),
  asyncHandler(pickupController.getPickupById)
);
router.patch(
  '/:id/cancel',
  authMiddleware,
  validate(cancelPickupSchema),
  asyncHandler(pickupController.cancelPickup)
);
router.post(
  '/:id/rebook',
  authMiddleware,
  validate(rebookPickupSchema),
  asyncHandler(pickupController.rebookPickup)
);
router.post(
  '/:id/rate',
  authMiddleware,
  validate(ratePickupSchema),
  asyncHandler(pickupController.ratePickup)
);

module.exports = router;
