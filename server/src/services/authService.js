// services/authService.js
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const logger = require('../utils/logger');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL);

// JWT configuration
const accessTokenExpiration = process.env.JWT_ACCESS_EXPIRATION || '15m';
const refreshTokenExpiration = process.env.JWT_REFRESH_EXPIRATION || '7d';

// Hash password using argon2
const hashPassword = async (password) => {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });
  } catch (error) {
    logger.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
};

// Verify password
const verifyPassword = async (plainPassword, hashedPassword) => {
  try {
    return await argon2.verify(hashedPassword, plainPassword);
  } catch (error) {
    logger.error('Password verification error:', error);
    throw new Error('Failed to verify password');
  }
};

// Find user by email
const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: { email },
    include: { profile: true }
  });
};

// Create new user
// services/authService.js
const createUser = async ({ email, password, name, isGitHubLogin = false }) => {
  const hashedPassword = isGitHubLogin 
    ? require('crypto').randomBytes(32).toString('hex') // Unused but valid
    : await hashPassword(password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        authProvider: isGitHubLogin ? 'github' : 'local'
      }
    });

    if (name) {
      const [firstName, ...lastNameParts] = name.split(' ');
      await tx.profile.create({
        data: {
          firstName,
          lastName: lastNameParts.join(' ') || null,
          userId: user.id
        }
      });
    }

    return tx.user.findUnique({
      where: { id: user.id },
      include: { profile: true }
    });
  });
};
// Generate JWT tokens
// Make sure this is async
const generateAuthTokens = async (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'default_access_secret',
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
    { expiresIn: '7d' }
  );
  
  // If you need to use Redis, make sure redis is properly imported
  const jti = uuidv4(); // Make sure uuidv4 is imported
  await redis.set(`refresh_token:${jti}`, user.id, 'EX', 7 * 24 * 60 * 60); // 7 days
  
  return { accessToken, refreshToken };
};
// Refresh authentication tokens
const refreshAuthTokens = async (refreshToken) => {
  try {
    // Verify refresh token using jwt.verify()
    const payload = jwt.verify(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET || 'default_refresh_secret'
    );

    const { userId, jti } = payload;
    
    // Rest of the function remains the same...
  } catch (error) {
    logger.error('Refresh token verification error:', error);
    return null;
  }
};

const invalidateRefreshToken = async (refreshToken) => {
  try {
    // Verify refresh token using jwt.verify()
    const payload = jwt.verify(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET || 'default_refresh_secret'
    );
    
    const { jti } = payload;
    await redis.del(`refresh_token:${jti}`);
    return true;
  } catch (error) {
    logger.error('Invalidate refresh token error:', error);
    return false;
  }
};
module.exports = {
  findUserByEmail,
  createUser,
  verifyPassword,
  generateAuthTokens,
  refreshAuthTokens,
  invalidateRefreshToken,
  hashPassword
};