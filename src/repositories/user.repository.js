const pool = require('../config/database');
const userModel = require('../models/user.model');
const addressModel = require('../models/address.model');

const findByPhone = async (phone) => {
  const result = await pool.query('SELECT * FROM users WHERE phone = $1 LIMIT 1', [phone]);
  if (!result.rows.length) return null;
  return userModel.fromRow(result.rows[0]);
};

const findById = async (id) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  if (!result.rows.length) return null;
  return userModel.fromRow(result.rows[0]);
};

const create = async (phone, userType = 'user') => {
  const result = await pool.query(
    'INSERT INTO users (phone, user_type) VALUES ($1, $2) RETURNING *',
    [phone, userType]
  );
  return userModel.fromRow(result.rows[0]);
};

const updateRole = async (id, userType) => {
  const result = await pool.query(
    `
      UPDATE users
      SET
        user_type = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id, userType]
  );

  if (!result.rows.length) return null;
  return userModel.fromRow(result.rows[0]);
};

const updateProfile = async (id, payload) => {
  const fields = [];
  const values = [];
  let idx = 2;

  if (payload.fullName !== undefined) {
    fields.push(`full_name = $${idx++}`);
    values.push(payload.fullName);
  }

  if (payload.country !== undefined) {
    fields.push(`country = $${idx++}`);
    values.push(payload.country);
  }

  if (payload.operatingCity !== undefined) {
    fields.push(`operating_city = $${idx++}`);
    values.push(payload.operatingCity);
  }

  if (!fields.length) {
    return findById(id);
  }

  fields.push('updated_at = NOW()');

  const result = await pool.query(
    `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `,
    [id, ...values]
  );

  if (!result.rows.length) return null;
  return userModel.fromRow(result.rows[0]);
};

const createAddress = async (userId, payload) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (payload.isDefault) {
      await client.query(
        'UPDATE user_addresses SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1',
        [userId]
      );
    }

    const result = await client.query(
      `
        INSERT INTO user_addresses (
          user_id, label, line1, line2, city, state, pincode, country, is_default
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        userId,
        payload.label,
        payload.line1,
        payload.line2,
        payload.city,
        payload.state,
        payload.pincode,
        payload.country,
        payload.isDefault
      ]
    );

    await client.query('COMMIT');
    return addressModel.fromRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const findAddressesByUserId = async (userId) => {
  const result = await pool.query(
    `
      SELECT *
      FROM user_addresses
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at DESC
    `,
    [userId]
  );

  return result.rows.map(addressModel.fromRow);
};

const findAddressById = async (addressId, userId) => {
  const result = await pool.query(
    `
      SELECT *
      FROM user_addresses
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [addressId, userId]
  );

  if (!result.rows.length) return null;
  return addressModel.fromRow(result.rows[0]);
};

const updateAddress = async (addressId, userId, payload) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (payload.isDefault) {
      await client.query(
        'UPDATE user_addresses SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1',
        [userId]
      );
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (payload.label !== undefined) {
      fields.push(`label = $${idx++}`);
      values.push(payload.label);
    }
    if (payload.line1 !== undefined) {
      fields.push(`line1 = $${idx++}`);
      values.push(payload.line1);
    }
    if (payload.line2 !== undefined) {
      fields.push(`line2 = $${idx++}`);
      values.push(payload.line2);
    }
    if (payload.city !== undefined) {
      fields.push(`city = $${idx++}`);
      values.push(payload.city);
    }
    if (payload.state !== undefined) {
      fields.push(`state = $${idx++}`);
      values.push(payload.state);
    }
    if (payload.pincode !== undefined) {
      fields.push(`pincode = $${idx++}`);
      values.push(payload.pincode);
    }
    if (payload.country !== undefined) {
      fields.push(`country = $${idx++}`);
      values.push(payload.country);
    }
    if (payload.isDefault !== undefined) {
      fields.push(`is_default = $${idx++}`);
      values.push(payload.isDefault);
    }

    fields.push('updated_at = NOW()');

    const result = await client.query(
      `
        UPDATE user_addresses
        SET ${fields.join(', ')}
        WHERE id = $${idx++} AND user_id = $${idx}
        RETURNING *
      `,
      [...values, addressId, userId]
    );

    await client.query('COMMIT');

    if (!result.rows.length) return null;
    return addressModel.fromRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteAddress = async (addressId, userId) => {
  const result = await pool.query(
    'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING id',
    [addressId, userId]
  );

  return Boolean(result.rows.length);
};

const listBuyers = async ({ city = null, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const normalizedCity = city ? city.trim().toLowerCase() : null;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::INT AS total
      FROM users
      WHERE user_type = 'buyer'
        AND ($1::TEXT IS NULL OR LOWER(TRIM(COALESCE(operating_city, ''))) = $1)
    `,
    [normalizedCity]
  );

  const result = await pool.query(
    `
      SELECT *
      FROM users
      WHERE user_type = 'buyer'
        AND ($1::TEXT IS NULL OR LOWER(TRIM(COALESCE(operating_city, ''))) = $1)
      ORDER BY updated_at DESC, created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [normalizedCity, limit, offset]
  );

  return {
    items: result.rows.map(userModel.fromRow),
    pagination: {
      page,
      limit,
      total: countResult.rows[0]?.total || 0
    }
  };
};

module.exports = {
  findByPhone,
  findById,
  create,
  updateRole,
  updateProfile,
  createAddress,
  findAddressesByUserId,
  findAddressById,
  updateAddress,
  deleteAddress,
  listBuyers
};
