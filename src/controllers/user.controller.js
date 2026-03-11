const ApiError = require('../utils/ApiError');
const userService = require('../services/user.service');

const getMe = async (req, res) => {
  const user = await userService.getMyProfile(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return res.status(200).json({
    success: true,
    data: user
  });
};

module.exports = {
  getMe
};
