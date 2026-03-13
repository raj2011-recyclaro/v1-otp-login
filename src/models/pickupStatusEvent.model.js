const pickupStatusEventModel = {
  fromRow: (row) => ({
    id: row.id,
    pickupId: row.pickup_id,
    status: row.status,
    note: row.note,
    metadata: row.metadata,
    createdAt: row.created_at
  })
};

module.exports = pickupStatusEventModel;
