const admin = require('../config/firebase');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const {
  signAccessToken,
  generateRefreshToken,
  hashToken
} = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');
const sessionRepository = require('../repositories/session.repository');

const USER_ROLE = {
  ADMIN: 'admin',
  BUYER: 'buyer',
  LEGACY_USER: 'user'
};

const decodeJwtPayload = (token) => {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '='
    );

    return JSON.parse(Buffer.from(paddedPayload, 'base64').toString('utf8'));
  } catch (_error) {
    return null;
  }
};

const buildTokenDebugContext = (idToken) => {
  const payload = decodeJwtPayload(idToken);

  if (!payload) {
    return { tokenShape: 'unreadable' };
  }

  return {
    aud: payload.aud,
    iss: payload.iss,
    sub: payload.sub,
    phoneNumber: payload.phone_number || null,
    authTime: payload.auth_time || null,
    exp: payload.exp || null
  };
};

const normalizeRole = (userType) => {
  if (!userType || userType === USER_ROLE.BUYER || userType === USER_ROLE.LEGACY_USER) {
    return USER_ROLE.BUYER;
  }

  return userType;
};

const assertAdminLoginCode = (adminCode) => {
  if (!env.adminLoginCodes.length) {
    throw new ApiError(500, 'Admin login is not configured');
  }

  if (!adminCode || !env.adminLoginCodes.includes(adminCode.trim())) {
    throw new ApiError(403, 'Invalid admin code');
  }
};

const findOrCreateUserByPhone = async (phone, userType = USER_ROLE.BUYER) => {
  let user = await userRepository.findByPhone(phone);
  if (!user) {
    user = await userRepository.create(phone, userType);
    return user;
  }

  const currentRole = normalizeRole(user.userType);

  if (currentRole === userType && user.userType !== userType) {
    user = await userRepository.updateRole(user.id, userType);
  } else if (currentRole !== userType) {
    throw new ApiError(403, `This phone number is already registered as ${currentRole}`);
  }

  return user;
};

const createSessionTokens = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  await sessionRepository.create(user.id, refreshTokenHash);

  return {
    accessToken,
    refreshToken,
    expiresIn: env.jwtExpiresIn
  };
};

const firebaseLogin = async (idToken, userType = USER_ROLE.BUYER, adminCode = null) => {
  let decodedToken;
  const expectedProjectId = admin.app().options.projectId || env.firebaseProjectId;
  const tokenDebugContext = buildTokenDebugContext(idToken);
  const requestedRole = normalizeRole(userType);

  if (requestedRole === USER_ROLE.ADMIN) {
    assertAdminLoginCode(adminCode);
  }

  try {
    // Verify Firebase ID token from the mobile app.
    decodedToken = await admin.auth().verifyIdToken(idToken, true);
  } catch (error) {
    console.error('Firebase token verification failed', {
      firebaseAdminCode: error.code || null,
      firebaseAdminMessage: error.message || null,
      expectedProjectId,
      token: tokenDebugContext
    });
    throw new ApiError(401, 'Invalid Firebase ID token');
  }

  // Ensure token belongs to the configured Firebase project.
  if (expectedProjectId && decodedToken.aud !== expectedProjectId) {
    console.error('Firebase token project mismatch', {
      expectedProjectId,
      tokenAudience: decodedToken.aud,
      tokenIssuer: decodedToken.iss,
      phoneNumber: decodedToken.phone_number || null,
      uid: decodedToken.uid || null
    });
    throw new ApiError(401, 'Firebase token project mismatch');
  }

  const phone = decodedToken.phone_number;
  if (!phone) {
    throw new ApiError(400, 'Phone number not found in Firebase token');
  }

  const user = await findOrCreateUserByPhone(phone, requestedRole);
  const tokens = await createSessionTokens(user);

  return {
    user,
    tokens,
    meta: {
      operationsProfileComplete:
        requestedRole === USER_ROLE.ADMIN || Boolean(user.operatingCity)
    }
  };
};

const refreshToken = async (incomingRefreshToken) => {
  const incomingHash = hashToken(incomingRefreshToken);
  const session = await sessionRepository.findByRefreshTokenHash(incomingHash);

  if (!session) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  // Rotate refresh token to reduce replay risk.
  await sessionRepository.deleteById(session.id);
  const user = await userRepository.findById(session.userId);

  if (!user) {
    throw new ApiError(401, 'User no longer exists');
  }

  const tokens = await createSessionTokens(user);

  return tokens;
};

module.exports = {
  firebaseLogin,
  refreshToken
};
