const userRepository = require('../repositories/user.repository');
const ApiError = require('../utils/ApiError');

const getMyProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  return user;
};

const updateMyProfile = async (userId, payload) => {
  const user = await userRepository.updateProfile(
    userId,
    payload.fullName,
    payload.country,
    payload.userType
  );
  return user;
};

const createMyAddress = async (userId, payload) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const addresses = await userRepository.findAddressesByUserId(userId);
  if (addresses.length >= 5) {
    throw new ApiError(400, 'Address limit reached. Maximum 5 addresses allowed.');
  }

  const addressPayload = {
    label: payload.label,
    line1: payload.line1,
    line2: payload.line2 || null,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    country: payload.country,
    isDefault: payload.isDefault
  };

  const address = await userRepository.createAddress(userId, addressPayload);
  return address;
};

const listMyAddresses = async (userId) => {
  return userRepository.findAddressesByUserId(userId);
};

const updateMyAddress = async (userId, addressId, payload) => {
  const existingAddress = await userRepository.findAddressById(addressId, userId);
  if (!existingAddress) {
    throw new ApiError(404, 'Address not found');
  }

  const addressPayload = {
    label: payload.label,
    line1: payload.line1,
    line2: payload.line2,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    country: payload.country,
    isDefault: payload.isDefault
  };

  const updatedAddress = await userRepository.updateAddress(addressId, userId, addressPayload);
  return updatedAddress;
};

const deleteMyAddress = async (userId, addressId) => {
  const deleted = await userRepository.deleteAddress(addressId, userId);
  if (!deleted) {
    throw new ApiError(404, 'Address not found');
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  createMyAddress,
  listMyAddresses,
  updateMyAddress,
  deleteMyAddress
};
