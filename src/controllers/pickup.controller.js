const pickupService = require('../services/pickup.service');

const createPickup = async (req, res) => {
  const pickup = await pickupService.createPickup(req.user.id, req.body);

  return res.status(201).json({
    success: true,
    data: pickup
  });
};

const listPickups = async (req, res) => {
  const result = await pickupService.listPickups(req.user.id, req.query);

  return res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination
  });
};

const getPickupById = async (req, res) => {
  const pickup = await pickupService.getPickupDetail(req.user.id, req.params.id);

  return res.status(200).json({
    success: true,
    data: pickup
  });
};

const cancelPickup = async (req, res) => {
  const pickup = await pickupService.cancelPickup(req.user.id, req.params.id, req.body.reason);

  return res.status(200).json({
    success: true,
    data: pickup
  });
};

const rebookPickup = async (req, res) => {
  const pickup = await pickupService.rebookPickup(req.user.id, req.params.id, req.body);

  return res.status(201).json({
    success: true,
    data: pickup
  });
};

const ratePickup = async (req, res) => {
  const rating = await pickupService.ratePickup(req.user.id, req.params.id, req.body);

  return res.status(201).json({
    success: true,
    data: rating
  });
};

module.exports = {
  createPickup,
  listPickups,
  getPickupById,
  cancelPickup,
  rebookPickup,
  ratePickup
};
