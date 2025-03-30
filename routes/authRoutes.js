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
const { protect } = require('../middleware/authMiddleware');

// Login routes
router.get('/login', getLogin);
router.post('/login', postLogin);

// Register routes
router.get('/register', getRegister);
router.post('/register', postRegister);

// Logout route
router.get('/logout', protect, logout);

// Forgot password routes
router.get('/forgot-password', getForgotPassword);
router.post('/forgot-password', postForgotPassword);

// Reset password routes
router.get('/reset-password/:resetToken', getResetPassword);
router.post('/reset-password/:resetToken', postResetPassword);

module.exports = router;