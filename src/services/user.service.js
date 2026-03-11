const userRepository = require('../repositories/user.repository');

const getMyProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  return user;
};

module.exports = {
  getMyProfile
};
