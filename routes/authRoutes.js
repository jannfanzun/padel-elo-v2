const express = require('express');
const router = express.Router();
const { 
    getLogin, 
    postLogin, 
    getRegister, 
    postRegister, 
    logout,
    getForgotPassword,
    postForgotPassword,
    getResetPassword,
    postResetPassword
} = require('../controllers/authController');
const { protect, redirectIfAuthenticated } = require('../middleware/authMiddleware');
const { 
    authLimiter, 
    registerLimiter, 
    passwordResetLimiter 
} = require('../middleware/rateLimitMiddleware');

// Login routes - use redirectIfAuthenticated to check for active sessions
router.get('/login', redirectIfAuthenticated, getLogin);
router.post('/login', postLogin);

// Register routes - use redirectIfAuthenticated to check for active sessions
router.get('/register', redirectIfAuthenticated, getRegister);
router.post('/register', postRegister);

// Logout route
router.get('/logout', protect, logout);

// Forgot password routes
router.get('/forgot-password', getForgotPassword);
router.post('/forgot-password', passwordResetLimiter, postForgotPassword);

// Reset password routes
router.get('/reset-password/:resetToken', getResetPassword);
router.post('/reset-password/:resetToken', passwordResetLimiter, postResetPassword);

module.exports = router;