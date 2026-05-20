const pickupModel = {
  fromRow: (row) => ({
    id: row.id,
    userId: row.user_id,
    status: row.status,
    buyerId: row.buyer_id,
    buyerAcceptedAt: row.buyer_accepted_at,
    adminOwnerId: row.admin_owner_id,
    adminAssignedAt: row.admin_assigned_at,
    category: row.category,
    weight: row.weight_kg,
    transportMode: row.transport_mode,
    addressSnapshot: row.address_snapshot,
    pickupCity: row.pickup_city || row.address_snapshot?.city || null,
    buyerSkipCount: row.buyer_skip_count !== undefined ? Number(row.buyer_skip_count) : undefined,
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
