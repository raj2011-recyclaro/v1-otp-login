const userModel = {
  fromRow: (row) => ({
    id: row.id,
    phone: row.phone,
    userType: row.user_type,
    fullName: row.full_name,
    country: row.country,
    operatingCity: row.operating_city,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  })
};

module.exports = userModel;
