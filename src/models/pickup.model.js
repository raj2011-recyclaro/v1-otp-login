const pickupModel = {
  fromRow: (row) => ({
    id: row.id,
    userId: row.user_id,
    status: row.status,
    category: row.category,
    weight: row.weight_kg,
    transportMode: row.transport_mode,
    addressSnapshot: row.address_snapshot,
    pickupDate: row.pickup_date,
    pickupTime: row.pickup_time,
    scheduledAt: row.scheduled_at,
    notes: row.notes,
    cancelReason: row.cancel_reason,
    rebookedFromPickupId: row.rebooked_from_pickup_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  })
};

module.exports = pickupModel;
