const authService = require('../services/auth.service');

const firebaseLogin = async (req, res) => {
  const { idToken } = req.body;
  const payload = await authService.firebaseLogin(idToken);

  return res.status(200).json({
    success: true,
    data: payload
  });
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshToken(refreshToken);

  return res.status(200).json({
    success: true,
    data: tokens
  });
};

module.exports = {
  firebaseLogin,
  refreshToken
};
