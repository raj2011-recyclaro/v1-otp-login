const ApiError = require('../utils/ApiError');
const pickupRepository = require('../repositories/pickup.repository');
const userRepository = require('../repositories/user.repository');

const PICKUP_STATUS = {
  BOOKED: 'BOOKED',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  DRIVER_EN_ROUTE: 'DRIVER_EN_ROUTE',
  ARRIVED: 'ARRIVED',
  PICKUP_COMPLETED: 'PICKUP_COMPLETED',
  PAYMENT_CREDITED: 'PAYMENT_CREDITED',
  CANCELLED: 'CANCELLED'
};

const CANCELLABLE_STATUSES = [PICKUP_STATUS.BOOKED, PICKUP_STATUS.DRIVER_ASSIGNED];
const RATEABLE_STATUSES = [PICKUP_STATUS.PICKUP_COMPLETED, PICKUP_STATUS.PAYMENT_CREDITED];

const toAddressSnapshot = (address) => ({
  label: address.label,
  line1: address.line1,
  line2: address.line2,
  city: address.city,
  state: address.state,
  pincode: address.pincode,
  country: address.country
});

const getAddressSnapshotForBooking = async (userId, payload) => {
  if (payload.addressId) {
    const address = await userRepository.findAddressById(payload.addressId, userId);
    if (!address) {
      throw new ApiError(404, 'Address not found');
    }
    return toAddressSnapshot(address);
  }

  if (payload.address) {
    return {
      label: payload.address.label || 'other',
      line1: payload.address.line1,
      line2: payload.address.line2 || null,
      city: payload.address.city,
      state: payload.address.state,
      pincode: payload.address.pincode,
      country: payload.address.country || 'India'
    };
  }

  throw new ApiError(400, 'Either addressId or address is required');
};

const createPickup = async (userId, payload) => {
  const addressSnapshot = await getAddressSnapshotForBooking(userId, payload);

  return pickupRepository.createPickup(userId, {
    category: payload.category,
    weight: payload.weight,
    transportMode: payload.transportMode,
    addressSnapshot,
    pickupDate: payload.date,
    pickupTime: payload.time,
    scheduledAt: payload.scheduledAt || null,
    notes: payload.notes || null
  });
};

const listPickups = async (userId, query) => {
  return pickupRepository.listByUser(userId, query);
};

const getPickupDetail = async (userId, pickupId) => {
  const pickup = await pickupRepository.findByIdForUser(pickupId, userId);
  if (!pickup) {
    throw new ApiError(404, 'Pickup not found');
  }

  const [timeline, rating] = await Promise.all([
    pickupRepository.findTimeline(pickup.id),
    pickupRepository.findRatingByPickupId(pickup.id)
  ]);

  return {
    ...pickup,
    timeline,
    rating
  };
};

const cancelPickup = async (userId, pickupId, reason = null) => {
  const pickup = await pickupRepository.findByIdForUser(pickupId, userId);
  if (!pickup) {
    throw new ApiError(404, 'Pickup not found');
  }

  if (pickup.status === PICKUP_STATUS.CANCELLED) {
    throw new ApiError(400, 'Pickup is already cancelled');
  }

  if (!CANCELLABLE_STATUSES.includes(pickup.status)) {
    throw new ApiError(400, `Cannot cancel pickup from status ${pickup.status}`);
  }

  return pickupRepository.updateStatusForUser(pickupId, userId, {
    nextStatus: PICKUP_STATUS.CANCELLED,
    note: reason || 'Cancelled by user',
    metadata: { cancelledBy: 'user' },
    cancelReason: reason
  });
};

const rebookPickup = async (userId, pickupId, payload) => {
  const pickup = await pickupRepository.findByIdForUser(pickupId, userId);
  if (!pickup) {
    throw new ApiError(404, 'Pickup not found');
  }

  if (pickup.status !== PICKUP_STATUS.CANCELLED) {
    throw new ApiError(400, 'Only cancelled pickups can be rebooked');
  }

  return pickupRepository.createPickup(userId, {
    category: payload.category ?? pickup.category,
    weight: payload.weight ?? pickup.weight,
    transportMode: payload.transportMode ?? pickup.transportMode,
    addressSnapshot: pickup.addressSnapshot,
    pickupDate: payload.date ?? pickup.pickupDate,
    pickupTime: payload.time ?? pickup.pickupTime,
    scheduledAt: payload.scheduledAt ?? pickup.scheduledAt ?? null,
    notes: payload.notes ?? pickup.notes ?? null,
    rebookedFromPickupId: pickup.id
  });
};

const ratePickup = async (userId, pickupId, payload) => {
  const pickup = await pickupRepository.findByIdForUser(pickupId, userId);
  if (!pickup) {
    throw new ApiError(404, 'Pickup not found');
  }

  if (!RATEABLE_STATUSES.includes(pickup.status)) {
    throw new ApiError(400, `Pickup cannot be rated in status ${pickup.status}`);
  }

  const existingRating = await pickupRepository.findRatingByPickupId(pickup.id);
  if (existingRating) {
    throw new ApiError(400, 'Pickup already rated');
  }

  return pickupRepository.createRating(pickup.id, userId, payload.rating, payload.review || null);
};

module.exports = {
  PICKUP_STATUS,
  createPickup,
  listPickups,
  getPickupDetail,
  cancelPickup,
  rebookPickup,
  ratePickup
};
