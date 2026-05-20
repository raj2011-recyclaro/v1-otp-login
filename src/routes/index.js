const express = require('express');
const authRoutes = require('./auth.routes');
const operationsRoutes = require('./operations.routes');
const userRoutes = require('./user.routes');
const pickupRoutes = require('./pickup.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/operations', operationsRoutes);
router.use('/users', userRoutes);
router.use('/pickups', pickupRoutes);

module.exports = router;
