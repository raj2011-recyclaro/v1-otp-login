const ApiError = require('../utils/ApiError');
const pickupRepository = require('../repositories/pickup.repository');
const userRepository = require('../repositories/user.repository');

const USER_ROLE = {
  ADMIN: 'admin',
  BUYER: 'buyer'
};

const normalizeCity = (value) => value?.trim().toLowerCase() || null;

const ensureBuyerHasCity = (user) => {
  if (!user.operatingCity) {
    throw new ApiError(400, 'Buyer must set operatingCity before viewing pickups');
  }
};

const ensurePickupVisibleToBuyer = (pickup, buyer) => {
  const pickupCity = normalizeCity(pickup.pickupCity);
  const buyerCity = normalizeCity(buyer.operatingCity);

  if (!pickupCity || pickupCity !== buyerCity) {
    throw new ApiError(403, 'This pickup is outside your operating city');
  }
};

const getPickupById = async (user, pickupId) => {
  const pickup = await pickupRepository.findById(pickupId);

  if (!pickup) {
    throw new ApiError(404, 'Pickup not found');
  }

  if (user.userType === USER_ROLE.BUYER) {
    ensureBuyerHasCity(user);
    ensurePickupVisibleToBuyer(pickup, user);

    if (pickup.buyerId && pickup.buyerId !== user.id) {
      throw new ApiError(403, 'This pickup has already been accepted by another buyer');
    }

    const skipped = await pickupRepository.hasBuyerSkippedPickup(pickup.id, user.id);
    if (skipped && pickup.buyerId !== user.id) {
      throw new ApiError(403, 'You have already skipped this pickup');
    }
  }

  const [timeline, skipSummary] = await Promise.all([
    pickupRepository.findTimeline(pickup.id),
    pickupRepository.getBuyerSkipSummary(pickup.id)
  ]);

  return {
    ...pickup,
    buyerSkipCount: skipSummary.count,
    timeline
  };
};

const listPickups = async (user, query) => {
  if (user.userType === USER_ROLE.BUYER) {
    ensureBuyerHasCity(user);
    return pickupRepository.listForBuyer(user, query);
  }

  if (user.userType === USER_ROLE.ADMIN) {
    return pickupRepository.listForAdmin(query);
  }

  throw new ApiError(403, 'This role cannot access operations pickups');
};

const acceptPickup = async (buyer, pickupId) => {
  ensureBuyerHasCity(buyer);
  return pickupRepository.acceptPickupForBuyer(pickupId, buyer);
};

const skipPickup = async (buyer, pickupId, reason = null) => {
  ensureBuyerHasCity(buyer);
  return pickupRepository.skipPickupForBuyer(pickupId, buyer, reason);
};

const startAdminTakeover = async (admin, pickupId, note = null) => {
  return pickupRepository.startAdminTakeover(pickupId, admin, note);
};

const updatePickupStatus = async (admin, pickupId, status, note = null) => {
  return pickupRepository.updatePickupStatusByAdmin(pickupId, admin, status, note);
};

const listBuyers = async (query) => {
  return userRepository.listBuyers(query);
};

module.exports = {
  getPickupById,
  listPickups,
  acceptPickup,
  skipPickup,
  startAdminTakeover,
  updatePickupStatus,
  listBuyers
};
