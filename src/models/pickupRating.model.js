const pickupRatingModel = {
  fromRow: (row) => ({
    id: row.id,
    pickupId: row.pickup_id,
    userId: row.user_id,
    rating: row.rating,
    review: row.review,
    createdAt: row.created_at
  })
};

module.exports = pickupRatingModel;
