const userModel = {
  fromRow: (row) => ({
    id: row.id,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  })
};

module.exports = userModel;
