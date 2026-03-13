const addressModel = {
  fromRow: (row) => ({
    id: row.id,
    userId: row.user_id,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    country: row.country,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  })
};

module.exports = addressModel;
