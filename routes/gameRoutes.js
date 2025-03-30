const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getAddGame,
  postAddGame,
  getGameDetails,
  getUserGames
} = require('../controllers/gameController');

// Add game routes
router.get('/add', protect, getAddGame);
router.post('/add', protect, postAddGame);

// Game details route
router.get('/:id', protect, getGameDetails);

// User games route
router.get('/user/history', protect, getUserGames);

module.exports = router;