const pool = require('../config/database');
const ApiError = require('../utils/ApiError');
const pickupModel = require('../models/pickup.model');
const pickupStatusEventModel = require('../models/pickupStatusEvent.model');
const pickupRatingModel = require('../models/pickupRating.model');

const PICKUP_STATUS = {
  BOOKED: 'BOOKED',
  BUYER_ACCEPTED: 'BUYER_ACCEPTED',
  ADMIN_IN_PROGRESS: 'ADMIN_IN_PROGRESS',
  PICKUP_COMPLETED: 'PICKUP_COMPLETED',
  PAYMENT_CREDITED: 'PAYMENT_CREDITED',
  CANCELLED: 'CANCELLED'
};

const normalizeCity = (value) => value?.trim().toLowerCase() || null;

const mapPickupRow = (row) =>
  pickupModel.fromRow({
    ...row,
    pickup_city: row.pickup_city || row.address_snapshot?.city || null
  });

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
      [pickup.id, rebookedFromPickupId ? 'Rebooked pickup created' : 'Pickup booked', rebookedFromPickupId ? { rebookedFromPickupId } : {}]
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

const findById = async (id) => {
  const result = await pool.query(
    `
      SELECT
        p.*,
        COALESCE(p.address_snapshot->>'city', '') AS pickup_city,
        (
          SELECT COUNT(*)::INT
          FROM pickup_buyer_skips s
          WHERE s.pickup_id = p.id
        ) AS buyer_skip_count
      FROM pickups p
      WHERE p.id = $1
      LIMIT 1
    `,
    [id]
  );

  if (!result.rows.length) return null;
  return mapPickupRow(result.rows[0]);
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

const buildOperationsWhereClause = ({ city = null, status = null, scope = 'available' }, user) => {
  const values = [];
  const conditions = [];
  let idx = 1;

  const normalizedCity = normalizeCity(city || user?.operatingCity);
  if (normalizedCity) {
    conditions.push(`LOWER(TRIM(COALESCE(p.address_snapshot->>'city', ''))) = $${idx++}`);
    values.push(normalizedCity);
  }

  if (status) {
    conditions.push(`p.status = $${idx++}`);
    values.push(status);
  }

  if (user?.id) {
    if (scope === 'accepted') {
      conditions.push(`p.buyer_id = $${idx++}`);
      values.push(user.id);
    } else if (scope === 'all') {
      conditions.push(
        `(
          (p.status = 'BOOKED' AND p.buyer_id IS NULL AND NOT EXISTS (
            SELECT 1 FROM pickup_buyer_skips s WHERE s.pickup_id = p.id AND s.buyer_id = $${idx}
          ))
          OR p.buyer_id = $${idx}
        )`
      );
      values.push(user.id);
      idx += 1;
    } else {
      conditions.push(`p.status = 'BOOKED'`);
      conditions.push('p.buyer_id IS NULL');
      conditions.push(
        `NOT EXISTS (
          SELECT 1 FROM pickup_buyer_skips s WHERE s.pickup_id = p.id AND s.buyer_id = $${idx++}
        )`
      );
      values.push(user.id);
    }
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  };
};

const listForBuyer = async (buyer, { status = null, scope = 'available', page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const { clause, values } = buildOperationsWhereClause({ status, scope }, buyer);
  const countResult = await pool.query(
    `
      SELECT COUNT(*)::INT AS total
      FROM pickups p
      ${clause}
    `,
    values
  );

  const result = await pool.query(
    `
      SELECT
        p.*,
        COALESCE(p.address_snapshot->>'city', '') AS pickup_city,
        (
          SELECT COUNT(*)::INT
          FROM pickup_buyer_skips s
          WHERE s.pickup_id = p.id
        ) AS buyer_skip_count
      FROM pickups p
      ${clause}
      ORDER BY p.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
    [...values, limit, offset]
  );

  return {
    items: result.rows.map(mapPickupRow),
    pagination: {
      page,
      limit,
      total: countResult.rows[0]?.total || 0
    }
  };
};

const listForAdmin = async ({ city = null, status = null, page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const { clause, values } = buildOperationsWhereClause({ city, status });
  const countResult = await pool.query(
    `
      SELECT COUNT(*)::INT AS total
      FROM pickups p
      ${clause}
    `,
    values
  );

  const result = await pool.query(
    `
      SELECT
        p.*,
        COALESCE(p.address_snapshot->>'city', '') AS pickup_city,
        (
          SELECT COUNT(*)::INT
          FROM pickup_buyer_skips s
          WHERE s.pickup_id = p.id
        ) AS buyer_skip_count
      FROM pickups p
      ${clause}
      ORDER BY p.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
    [...values, limit, offset]
  );

  return {
    items: result.rows.map(mapPickupRow),
    pagination: {
      page,
      limit,
      total: countResult.rows[0]?.total || 0
    }
  };
};

const assertPickupCityMatchesBuyer = (row, buyer) => {
  const pickupCity = normalizeCity(row.pickup_city || row.address_snapshot?.city);
  const buyerCity = normalizeCity(buyer.operatingCity);

  if (!pickupCity || pickupCity !== buyerCity) {
    throw new ApiError(403, 'This pickup is outside your operating city');
  }
};

const hasBuyerSkippedPickup = async (pickupId, buyerId) => {
  const result = await pool.query(
    `
      SELECT 1
      FROM pickup_buyer_skips
      WHERE pickup_id = $1 AND buyer_id = $2
      LIMIT 1
    `,
    [pickupId, buyerId]
  );

  return Boolean(result.rows.length);
};

const getBuyerSkipSummary = async (pickupId) => {
  const result = await pool.query(
    `
      SELECT COUNT(*)::INT AS count
      FROM pickup_buyer_skips
      WHERE pickup_id = $1
    `,
    [pickupId]
  );

  return {
    count: result.rows[0]?.count || 0
  };
};

const acceptPickupForBuyer = async (pickupId, buyer) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pickupResult = await client.query(
      `
        SELECT p.*, COALESCE(p.address_snapshot->>'city', '') AS pickup_city
        FROM pickups p
        WHERE p.id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [pickupId]
    );

    if (!pickupResult.rows.length) {
      throw new ApiError(404, 'Pickup not found');
    }

    const currentPickup = pickupResult.rows[0];
    assertPickupCityMatchesBuyer(currentPickup, buyer);

    if (currentPickup.buyer_id && currentPickup.buyer_id !== buyer.id) {
      throw new ApiError(409, 'Pickup has already been accepted by another buyer');
    }

    const skippedResult = await client.query(
      `
        SELECT 1
        FROM pickup_buyer_skips
        WHERE pickup_id = $1 AND buyer_id = $2
        LIMIT 1
      `,
      [pickupId, buyer.id]
    );

    if (skippedResult.rows.length) {
      throw new ApiError(400, 'You already skipped this pickup');
    }

    if (
      currentPickup.status === PICKUP_STATUS.BUYER_ACCEPTED &&
      currentPickup.buyer_id === buyer.id
    ) {
      await client.query('COMMIT');
      return mapPickupRow(currentPickup);
    }

    if (currentPickup.status !== PICKUP_STATUS.BOOKED) {
      throw new ApiError(409, `Pickup cannot be accepted from status ${currentPickup.status}`);
    }

    const updatedResult = await client.query(
      `
        UPDATE pickups
        SET
          buyer_id = $2,
          buyer_accepted_at = COALESCE(buyer_accepted_at, NOW()),
          status = 'BUYER_ACCEPTED',
          updated_at = NOW()
        WHERE id = $1
        RETURNING *, COALESCE(address_snapshot->>'city', '') AS pickup_city
      `,
      [pickupId, buyer.id]
    );

    await client.query(
      `
        INSERT INTO pickup_status_events (pickup_id, status, note, metadata)
        VALUES ($1, 'BUYER_ACCEPTED', $2, $3)
      `,
      [pickupId, 'Accepted by buyer', { buyerId: buyer.id }]
    );

    await client.query('COMMIT');
    return mapPickupRow(updatedResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const skipPickupForBuyer = async (pickupId, buyer, reason = null) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pickupResult = await client.query(
      `
        SELECT p.*, COALESCE(p.address_snapshot->>'city', '') AS pickup_city
        FROM pickups p
        WHERE p.id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [pickupId]
    );

    if (!pickupResult.rows.length) {
      throw new ApiError(404, 'Pickup not found');
    }

    const currentPickup = pickupResult.rows[0];
    assertPickupCityMatchesBuyer(currentPickup, buyer);

    if (currentPickup.buyer_id === buyer.id) {
      throw new ApiError(400, 'Accepted pickup cannot be skipped');
    }

    if (currentPickup.buyer_id && currentPickup.buyer_id !== buyer.id) {
      throw new ApiError(409, 'Pickup has already been accepted by another buyer');
    }

    await client.query(
      `
        INSERT INTO pickup_buyer_skips (pickup_id, buyer_id, reason)
        VALUES ($1, $2, $3)
        ON CONFLICT (pickup_id, buyer_id)
        DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()
      `,
      [pickupId, buyer.id, reason]
    );

    await client.query(
      `
        INSERT INTO pickup_status_events (pickup_id, status, note, metadata)
        VALUES ($1, $2, $3, $4)
      `,
      [
        pickupId,
        currentPickup.status,
        reason || 'Skipped by buyer',
        { buyerId: buyer.id, action: 'skip' }
      ]
    );

    await client.query('COMMIT');
    return mapPickupRow(currentPickup);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const startAdminTakeover = async (pickupId, admin, note = null) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pickupResult = await client.query(
      `
        SELECT p.*, COALESCE(p.address_snapshot->>'city', '') AS pickup_city
        FROM pickups p
        WHERE p.id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [pickupId]
    );

    if (!pickupResult.rows.length) {
      throw new ApiError(404, 'Pickup not found');
    }

    const currentPickup = pickupResult.rows[0];

    if (!currentPickup.buyer_id) {
      throw new ApiError(400, 'Admin takeover can only start after a buyer accepts the pickup');
    }

    if (currentPickup.admin_owner_id && currentPickup.admin_owner_id !== admin.id) {
      throw new ApiError(409, 'Another admin is already handling this pickup');
    }

    if (currentPickup.status === PICKUP_STATUS.ADMIN_IN_PROGRESS && currentPickup.admin_owner_id === admin.id) {
      await client.query('COMMIT');
      return mapPickupRow(currentPickup);
    }

    if (![PICKUP_STATUS.BUYER_ACCEPTED, PICKUP_STATUS.ADMIN_IN_PROGRESS].includes(currentPickup.status)) {
      throw new ApiError(409, `Admin takeover cannot start from status ${currentPickup.status}`);
    }

    const updatedResult = await client.query(
      `
        UPDATE pickups
        SET
          admin_owner_id = $2,
          admin_assigned_at = COALESCE(admin_assigned_at, NOW()),
          status = 'ADMIN_IN_PROGRESS',
          updated_at = NOW()
        WHERE id = $1
        RETURNING *, COALESCE(address_snapshot->>'city', '') AS pickup_city
      `,
      [pickupId, admin.id]
    );

    await client.query(
      `
        INSERT INTO pickup_status_events (pickup_id, status, note, metadata)
        VALUES ($1, 'ADMIN_IN_PROGRESS', $2, $3)
      `,
      [pickupId, note || 'Admin takeover started', { adminId: admin.id, buyerId: currentPickup.buyer_id }]
    );

    await client.query('COMMIT');
    return mapPickupRow(updatedResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const allowedAdminTransitions = {
  [PICKUP_STATUS.BOOKED]: [PICKUP_STATUS.CANCELLED],
  [PICKUP_STATUS.BUYER_ACCEPTED]: [PICKUP_STATUS.ADMIN_IN_PROGRESS, PICKUP_STATUS.CANCELLED],
  [PICKUP_STATUS.ADMIN_IN_PROGRESS]: [
    PICKUP_STATUS.PICKUP_COMPLETED,
    PICKUP_STATUS.PAYMENT_CREDITED,
    PICKUP_STATUS.CANCELLED
  ],
  [PICKUP_STATUS.PICKUP_COMPLETED]: [PICKUP_STATUS.PAYMENT_CREDITED],
  [PICKUP_STATUS.PAYMENT_CREDITED]: [],
  [PICKUP_STATUS.CANCELLED]: []
};

const updatePickupStatusByAdmin = async (pickupId, admin, nextStatus, note = null) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pickupResult = await client.query(
      `
        SELECT p.*, COALESCE(p.address_snapshot->>'city', '') AS pickup_city
        FROM pickups p
        WHERE p.id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [pickupId]
    );

    if (!pickupResult.rows.length) {
      throw new ApiError(404, 'Pickup not found');
    }

    const currentPickup = pickupResult.rows[0];

    if (currentPickup.admin_owner_id && currentPickup.admin_owner_id !== admin.id) {
      throw new ApiError(409, 'Another admin is already handling this pickup');
    }

    if (currentPickup.status === nextStatus) {
      await client.query('COMMIT');
      return mapPickupRow(currentPickup);
    }

    if (!allowedAdminTransitions[currentPickup.status]?.includes(nextStatus)) {
      throw new ApiError(409, `Cannot move pickup from ${currentPickup.status} to ${nextStatus}`);
    }

    if (nextStatus === PICKUP_STATUS.ADMIN_IN_PROGRESS && !currentPickup.buyer_id) {
      throw new ApiError(400, 'A buyer must accept the pickup before admin operations begin');
    }

    const updatedResult = await client.query(
      `
        UPDATE pickups
        SET
          status = $3,
          admin_owner_id = COALESCE(admin_owner_id, $2),
          admin_assigned_at = CASE
            WHEN $3 = 'ADMIN_IN_PROGRESS' THEN COALESCE(admin_assigned_at, NOW())
            ELSE admin_assigned_at
          END,
          cancel_reason = CASE
            WHEN $3 = 'CANCELLED' THEN $4
            ELSE cancel_reason
          END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *, COALESCE(address_snapshot->>'city', '') AS pickup_city
      `,
      [pickupId, admin.id, nextStatus, nextStatus === PICKUP_STATUS.CANCELLED ? note : null]
    );

    await client.query(
      `
        INSERT INTO pickup_status_events (pickup_id, status, note, metadata)
        VALUES ($1, $2, $3, $4)
      `,
      [pickupId, nextStatus, note || `Status updated to ${nextStatus}`, { adminId: admin.id }]
    );

    await client.query('COMMIT');
    return mapPickupRow(updatedResult.rows[0]);
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
  findById,
  updateStatusForUser,
  listForBuyer,
  listForAdmin,
  hasBuyerSkippedPickup,
  getBuyerSkipSummary,
  acceptPickupForBuyer,
  skipPickupForBuyer,
  startAdminTakeover,
  updatePickupStatusByAdmin,
  findTimeline,
  findRatingByPickupId,
  createRating
};
