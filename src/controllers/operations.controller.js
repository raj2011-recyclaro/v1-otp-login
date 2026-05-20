const operationsService = require('../services/operations.service');

const listPickups = async (req, res) => {
  const result = await operationsService.listPickups(req.user, req.query);

  return res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination
  });
};

const getPickupById = async (req, res) => {
  const pickup = await operationsService.getPickupById(req.user, req.params.id);

  return res.status(200).json({
    success: true,
    data: pickup
  });
};

const acceptPickup = async (req, res) => {
  const pickup = await operationsService.acceptPickup(req.user, req.params.id);

  return res.status(200).json({
    success: true,
    data: pickup
  });
};

const skipPickup = async (req, res) => {
  const pickup = await operationsService.skipPickup(req.user, req.params.id, req.body.reason);

  return res.status(200).json({
    success: true,
    data: pickup
  });
};

const startAdminTakeover = async (req, res) => {
  const pickup = await operationsService.startAdminTakeover(
    req.user,
    req.params.id,
    req.body.note
  );

  return res.status(200).json({
    success: true,
    data: pickup
  });
};

const updatePickupStatus = async (req, res) => {
  const pickup = await operationsService.updatePickupStatus(
    req.user,
    req.params.id,
    req.body.status,
    req.body.note
  );

  return res.status(200).json({
    success: true,
    data: pickup
  });
};

const listBuyers = async (req, res) => {
  const result = await operationsService.listBuyers(req.query);

  return res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination
  });
};

module.exports = {
  listPickups,
  getPickupById,
  acceptPickup,
  skipPickup,
  startAdminTakeover,
  updatePickupStatus,
  listBuyers
};
