const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const userRepository = require('../repositories/user.repository');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Missing or invalid Authorization header'));
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(payload.sub);

    if (!user) {
      return next(new ApiError(401, 'User not found for access token'));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired access token'));
  }
};

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication is required'));
  }

  if (!allowedRoles.includes(req.user.userType)) {
    return next(new ApiError(403, 'You are not allowed to access this resource'));
  }

  return next();
};

module.exports = authMiddleware;
module.exports.authorizeRoles = authorizeRoles;
