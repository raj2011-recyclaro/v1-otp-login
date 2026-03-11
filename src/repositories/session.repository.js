const pool = require('../config/database');
const sessionModel = require('../models/session.model');

const create = async (userId, refreshTokenHash) => {
  const result = await pool.query(
    'INSERT INTO sessions (user_id, refresh_token) VALUES ($1, $2) RETURNING *',
    [userId, refreshTokenHash]
  );
  return sessionModel.fromRow(result.rows[0]);
};

const findByRefreshTokenHash = async (refreshTokenHash) => {
  const result = await pool.query(
    'SELECT * FROM sessions WHERE refresh_token = $1 LIMIT 1',
    [refreshTokenHash]
  );
  if (!result.rows.length) return null;
  return sessionModel.fromRow(result.rows[0]);
};

const deleteById = async (id) => {
  await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
};

module.exports = {
  create,
  findByRefreshTokenHash,
  deleteById
};
