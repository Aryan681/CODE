const authService = require('../services/authService');
const { validateLoginData, validateRegisterData } = require('../utils/datavalidator');
const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const register = async (req, res, next) => {
  try {
    const validationResult = validateRegisterData(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: validationResult.error.errors
      });
    }
    
    const { email, password, name } = validationResult.data;
    const existingUser = await authService.findUserByEmail(email);
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    const user = await authService.createUser({ email, password, name });
    const { accessToken, refreshToken } = await authService.generateAuthTokens(user);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: formatUserResponse(user),
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const validationResult = validateLoginData(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: validationResult.error.errors
      });
    }
    
    const { email, password } = validationResult.data;
    const user = await authService.findUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    if (user.authProvider === 'github') {
      return res.status(403).json({
        success: false,
        message: 'Please sign in with GitHub',
        authProvider: ['github']
      });
    }
    
    const isPasswordValid = await authService.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const { accessToken, refreshToken } = await authService.generateAuthTokens(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUserResponse(user),
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    const tokens = await authService.refreshAuthTokens(refreshToken);
    
    if (!tokens) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        tokens
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    await authService.invalidateRefreshToken(refreshToken);
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
};

// Helper function to format user response
const formatUserResponse = (user) => ({
  id: user.id,
  email: user.email,
  authProvider: user.authProvider,
  createdAt: user.createdAt,
  profile: user.profile ? {
    id: user.profile.id,
    firstName: user.profile.firstName,
    lastName: user.profile.lastName,
    bio: user.profile.bio,
    avatarUrl: user.profile.avatarUrl
  } : null
});

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch user along with profile & projects
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            githubUrl: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: {
        user: formatUserResponse(user),
        projects: user.projects,
        githubConnected: !!user.githubAccessToken
      }
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Fetch fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: formatUserResponse(user)
      }
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  getCurrentUser
};