const ApiError = require('../utils/ApiError');
const userService = require('../services/user.service');

const getMe = async (req, res) => {
  const user = await userService.getMyProfile(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return res.status(200).json({
    success: true,
    data: user
  });
};

const updateMe = async (req, res) => {
  const user = await userService.updateMyProfile(req.user.id, req.body);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return res.status(200).json({
    success: true,
    data: user
  });
};

const createAddress = async (req, res) => {
  const address = await userService.createMyAddress(req.user.id, req.body);

  return res.status(201).json({
    success: true,
    data: address
  });
};

const listAddresses = async (req, res) => {
  const addresses = await userService.listMyAddresses(req.user.id);

  return res.status(200).json({
    success: true,
    data: addresses
  });
};

const updateAddress = async (req, res) => {
  const address = await userService.updateMyAddress(
    req.user.id,
    req.params.addressId,
    req.body
  );

  return res.status(200).json({
    success: true,
    data: address
  });
};

const deleteAddress = async (req, res) => {
  await userService.deleteMyAddress(req.user.id, req.params.addressId);

  return res.status(204).send();
};

module.exports = {
  getMe,
  updateMe,
  createAddress,
  listAddresses,
  updateAddress,
  deleteAddress
};
