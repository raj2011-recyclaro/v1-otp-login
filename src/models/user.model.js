const userModel = {
  fromRow: (row) => ({
    id: row.id,
    phone: row.phone,
    userType: row.user_type,
    fullName: row.full_name,
    country: row.country,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  })
};

module.exports = userModel;
