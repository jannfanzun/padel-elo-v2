const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Game = require('../models/Game');
const QuarterlyELO = require('../models/QuarterlyELO');
const { protect } = require('../middleware/authMiddleware');
const { ensureAllUsersHaveQuarterlyRecords } = require('../utils/quarterlyEloUtils');

// @desc    Home page with rankings
// @route   GET /
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Get ranking type from query (default to 'elo')
    const rankingType = req.query.type || 'elo';
    
    // Get current date
    const now = new Date();
    
    // Calculate start of current quarter
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const currentYear = now.getFullYear();
    const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
    
    // Ensure all users have quarterly ELO records
    await ensureAllUsersHaveQuarterlyRecords(now);
    
    // Get all users (excluding admin)
    const users = await User.find({ isAdmin: false })
      .sort({ eloRating: -1 })
      .select('username eloRating lastActivity');
    
    // Get all quarterly ELO records for current quarter
    const quarterlyELORecords = await QuarterlyELO.find({
      year: currentYear,
      quarter: currentQuarter
    });
    
    // Create a map for quick access
    const quarterlyELOMap = new Map();
    quarterlyELORecords.forEach(record => {
      quarterlyELOMap.set(record.user.toString(), record.startELO);
    });
    
    // Get all games in this quarter
    const quarterGames = await Game.find({
      createdAt: { $gte: quarterStart }
    }).populate('team1.player team2.player', 'username');
    
    // Calculate quarterly stats for each user
    const userStats = {};
    
    // Initialize stats for all users
    users.forEach(user => {
      const userId = user._id.toString();
      const startELO = quarterlyELOMap.has(userId) ? quarterlyELOMap.get(userId) : user.eloRating;
      
      userStats[userId] = {
        quarterlyGames: 0,
        quarterlyEloChange: user.eloRating - startELO,
        initialQuarterElo: startELO,
        currentElo: user.eloRating
      };
    });

    /**
   * @desc    Show Terms and Conditions (AGB) page
   * @route   GET /agb
   * @access  Public
   */
  router.get('/agb', (req, res) => {
    res.render('agb', {
      title: 'Allgemeine Geschäftsbedingungen',
      user: req.user || null
    });
  });

      /**
   * @desc    Show About padELO page
   * @route   GET /about
   * @access  Public
   */
      router.get('/about', (req, res) => {
        res.render('about', {
          title: 'Über padELO',
          user: req.user || null
        });
      });
    
    // Count games for each player in this quarter
    quarterGames.forEach(game => {
      // Process Team 1 players
      game.team1.forEach(playerData => {
        const playerId = playerData.player._id.toString();
        if (userStats[playerId]) {
          userStats[playerId].quarterlyGames++;
        }
      });
      
      // Process Team 2 players
      game.team2.forEach(playerData => {
        const playerId = playerData.player._id.toString();
        if (userStats[playerId]) {
          userStats[playerId].quarterlyGames++;
        }
      });
    });
    
    // Create rankings array with different sorting based on ranking type
    let rankings = [];
    
    users.forEach(user => {
      const userId = user._id.toString();
      const stats = userStats[userId] || { 
        quarterlyGames: 0, 
        quarterlyEloChange: 0,
        initialQuarterElo: user.eloRating,
        currentElo: user.eloRating
      };
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const isInactive = user.lastActivity < sevenDaysAgo;
      
      rankings.push({
        user,
        isInactive,
        quarterlyGames: stats.quarterlyGames,
        quarterlyEloChange: stats.quarterlyEloChange,
        initialQuarterElo: stats.initialQuarterElo
      });
    });
    
    // Sort based on ranking type
    if (rankingType === 'quarterly-improvement') {
      rankings.sort((a, b) => b.quarterlyEloChange - a.quarterlyEloChange);
    } else if (rankingType === 'quarterly-games') {
      rankings.sort((a, b) => b.quarterlyGames - a.quarterlyGames);
    } else {
      // Default 'elo' sorting - already sorted by the database query
    }
    
    // Add rank property to each item
    rankings = rankings.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
    
  // Format quarter name for display
  // Korrekte Quartalsmonate zuweisen
  const quarterStartMonths = ['Januar', 'April', 'Juli', 'Oktober'];
  const quarterEndMonths = ['März', 'Juni', 'September', 'Dezember'];
  const startMonth = quarterStartMonths[currentQuarter];
  const endMonth = quarterEndMonths[currentQuarter];
  const quarterName = `${startMonth} - ${endMonth} ${now.getFullYear()}`;
    
    res.render('index', {
      title: 'padELO Rankings',
      rankings,
      rankingType,
      quarterName,
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