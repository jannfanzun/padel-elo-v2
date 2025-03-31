const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { addGameLimiter } = require('../middleware/rateLimitMiddleware');
const { 
    getAddGame,
    postAddGame,
    getGameDetails,
    getUserGames,
    reportGame
} = require('../controllers/gameController');

// Add game routes
router.get('/add', protect, getAddGame);
router.post('/add', protect, addGameLimiter, postAddGame);

// Game details route
router.get('/:id', protect, getGameDetails);

// Report game issue
router.post('/:id/report', protect, reportGame);

// User games route
router.get('/user/history', protect, getUserGames);

module.exports = router;