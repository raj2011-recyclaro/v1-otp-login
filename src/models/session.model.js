const sessionModel = {
  fromRow: (row) => ({
    id: row.id,
    userId: row.user_id,
    refreshToken: row.refresh_token,
    createdAt: row.created_at
  })
};

module.exports = sessionModel;
