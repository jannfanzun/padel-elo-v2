const express = require('express');
const router = express.Router();
const { 
  getLogin, 
  postLogin, 
  getRegister, 
  postRegister, 
  logout 
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

module.exports = router;