const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getProfile,
  getRankings,
  updateProfile,
  getBookingPage // Neue Controller-Funktion
} = require('../controllers/userController');

// Profile routes
router.get('/profile', protect, getProfile);
router.post('/profile/update', protect, updateProfile);

// Rankings route
router.get('/rankings', protect, getRankings);

// Neue Buchungsroute
router.get('/booking', protect, getBookingPage);

module.exports = router;