const authService = require('../services/auth.service');

const firebaseLogin = async (req, res) => {
  const { idToken, userType, adminCode } = req.body;
  const payload = await authService.firebaseLogin(idToken, userType, adminCode);

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
