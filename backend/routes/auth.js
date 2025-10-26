const express = require('express');
const router = express.Router();
const authDb = require('../database/auth/db');
const { sendEmailOtp } = require('../database/auth/mailer');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         username:
 *           type: string
 *         displayName:
 *           type: string
 *         email:
 *           type: string
 *         avatar:
 *           type: string
 *         bio:
 *           type: string
 *         role:
 *           type: string
 *         following:
 *           type: array
 *           items:
 *             type: string
 *         followers:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - displayName
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               displayName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               bio:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
router.post('/register', async (req, res) => {
  try {
    const { username, displayName, email, password, bio, avatar } = req.body;

    // Validation
    if (!username || !displayName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, display name, email, and password are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Username validation
    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Username must be at least 3 characters long'
      });
    }

    // Create user
    const user = await authDb.createUser({
      username,
      displayName,
      email,
      password,
      bio,
      avatar
    });

    // Generate JWT token
    const token = authDb.generateToken(user);

    // Create session
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    await authDb.createSession(user.id, token, ipAddress, userAgent);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        following: JSON.parse(user.following || '[]'),
        followers: JSON.parse(user.followers || '[]'),
        createdAt: user.created_at
      },
      token,
      message: 'Registration successful'
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message && (error.message.includes('already exists') || error.message.includes('already taken'))) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Verify user credentials
    const user = await authDb.verifyUserPassword(email, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const twoFaEnabled = (process.env.TWO_FA_EMAIL_ENABLED || 'false').toLowerCase() === 'true';
    if (twoFaEnabled) {
      // Step 1: Generate and send OTP, do not create session yet
      const code = Math.floor(100000 + Math.random() * 900000);
      const ttlSeconds = parseInt(process.env.TWO_FA_EMAIL_TTL_SECONDS || '600', 10);
      await authDb.createEmailOtp(user.id, 'login', String(code), ttlSeconds);
      const mailResult = await sendEmailOtp(user.email, String(code));
      console.log('2FA mailer result:', mailResult);

      const devShowCode = (process.env.TWO_FA_DEV_SHOW_CODE || 'false').toLowerCase() === 'true';
      return res.json({
        success: true,
        twoFactorRequired: true,
        userHint: { email: user.email.replace(/(^.).+(@.*$)/, '$1***$2') },
        message: 'Verification code sent to email',
        ...(devShowCode ? { devCode: String(code) } : {})
      });
    }

    // 2FA disabled: proceed with normal session creation
    const token = authDb.generateToken(user);
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    await authDb.createSession(user.id, token, ipAddress, userAgent);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role || 'user',
        following: JSON.parse(user.following || '[]'),
        followers: JSON.parse(user.followers || '[]'),
        createdAt: user.created_at
      },
      token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = authDb.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // Invalidate session
    await authDb.invalidateSession(token);

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = authDb.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const user = await authDb.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role || 'user',
        following: JSON.parse(user.following || '[]'),
        followers: JSON.parse(user.followers || '[]'),
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
