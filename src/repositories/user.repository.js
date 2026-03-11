const pool = require('../config/database');
const userModel = require('../models/user.model');

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

const create = async (phone) => {
  const result = await pool.query(
    'INSERT INTO users (phone) VALUES ($1) RETURNING *',
    [phone]
  );
  return userModel.fromRow(result.rows[0]);
};

module.exports = {
  findByPhone,
  findById,
  create
};
