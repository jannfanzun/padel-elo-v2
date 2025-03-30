const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// @desc    Home page with rankings
// @route   GET /
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Get all users (excluding admin)
    const users = await User.find({ isAdmin: false })
      .sort({ eloRating: -1 })
      .select('username eloRating lastActivity');
    
    const rankings = users.map((user, index) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const isInactive = user.lastActivity < sevenDaysAgo;
      
      return {
        rank: index + 1,
        user,
        isInactive
      };
    });
    
    res.render('index', {
      title: 'Padel Rankings',
      rankings,
      user: req.user || null
    });
  } catch (error) {
    console.error('Home page error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'An error occurred while loading the rankings'
    });
  }
});

module.exports = router;