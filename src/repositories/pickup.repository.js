const pool = require('../config/database');
const pickupModel = require('../models/pickup.model');
const pickupStatusEventModel = require('../models/pickupStatusEvent.model');
const pickupRatingModel = require('../models/pickupRating.model');

const createPickup = async (
  userId,
  {
    category,
    weight,
    transportMode,
    addressSnapshot,
    pickupDate,
    pickupTime,
    scheduledAt = null,
    notes = null,
    rebookedFromPickupId = null
  }
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pickupResult = await client.query(
      `
        INSERT INTO pickups (
          user_id,
          status,
          category,
          weight_kg,
          transport_mode,
          address_snapshot,
          pickup_date,
          pickup_time,
          scheduled_at,
          notes,
          rebooked_from_pickup_id
        )
        VALUES ($1, 'BOOKED', $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [
        userId,
        category,
        weight,
        transportMode,
        addressSnapshot,
        pickupDate,
        pickupTime,
        scheduledAt,
        notes,
        rebookedFromPickupId
      ]
    );

    const pickup = pickupModel.fromRow(pickupResult.rows[0]);

    await client.query(
      `
        INSERT INTO pickup_status_events (pickup_id, status, note, metadata)
        VALUES ($1, 'BOOKED', $2, $3)
      `,
      [
        pickup.id,
        rebookedFromPickupId ? 'Rebooked pickup created' : 'Pickup booked',
        rebookedFromPickupId
          ? { rebookedFromPickupId }
          : {}
      ]
    );

    await client.query('COMMIT');
    return pickup;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const listByUser = async (userId, { status = null, page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::INT AS total
      FROM pickups
      WHERE user_id = $1 AND ($2::pickup_status IS NULL OR status = $2)
    `,
    [userId, status]
  );

  const result = await pool.query(
    `
      SELECT *
      FROM pickups
      WHERE user_id = $1 AND ($2::pickup_status IS NULL OR status = $2)
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `,
    [userId, status, limit, offset]
  );

  return {
    items: result.rows.map(pickupModel.fromRow),
    pagination: {
      page,
      limit,
      total: countResult.rows[0]?.total || 0
    }
  };
};

const findByIdForUser = async (id, userId) => {
  const result = await pool.query(
    'SELECT * FROM pickups WHERE id = $1 AND user_id = $2 LIMIT 1',
    [id, userId]
  );
  if (!result.rows.length) return null;
  return pickupModel.fromRow(result.rows[0]);
};

const updateStatusForUser = async (
  pickupId,
  userId,
  { nextStatus, note = null, metadata = {}, cancelReason = null }
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pickupResult = await client.query(
      `
        UPDATE pickups
        SET status = $3, cancel_reason = $4, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `,
      [pickupId, userId, nextStatus, cancelReason]
    );

    if (!pickupResult.rows.length) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `
        INSERT INTO pickup_status_events (pickup_id, status, note, metadata)
        VALUES ($1, $2, $3, $4)
      `,
      [pickupId, nextStatus, note, metadata]
    );

    await client.query('COMMIT');
    return pickupModel.fromRow(pickupResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const findTimeline = async (pickupId) => {
  const result = await pool.query(
    `
      SELECT *
      FROM pickup_status_events
      WHERE pickup_id = $1
      ORDER BY created_at ASC
    `,
    [pickupId]
  );

  return result.rows.map(pickupStatusEventModel.fromRow);
};

const findRatingByPickupId = async (pickupId) => {
  const result = await pool.query(
    'SELECT * FROM pickup_ratings WHERE pickup_id = $1 LIMIT 1',
    [pickupId]
  );

  if (!result.rows.length) return null;
  return pickupRatingModel.fromRow(result.rows[0]);
};

const createRating = async (pickupId, userId, rating, review = null) => {
  const result = await pool.query(
    `
      INSERT INTO pickup_ratings (pickup_id, user_id, rating, review)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [pickupId, userId, rating, review]
  );

  return pickupRatingModel.fromRow(result.rows[0]);
};

module.exports = {
  createPickup,
  listByUser,
  findByIdForUser,
  updateStatusForUser,
  findTimeline,
  findRatingByPickupId,
  createRating
};
