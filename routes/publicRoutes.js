const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Game = require('../models/Game');
const { protect } = require('../middleware/authMiddleware');

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
      const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      
      // Get all users (excluding admin)
      const users = await User.find({ isAdmin: false })
        .sort({ eloRating: -1 })
        .select('username eloRating lastActivity');
      
      // Get all games in this quarter
      const quarterGames = await Game.find({
        createdAt: { $gte: quarterStart }
      }).populate('team1.player team2.player', 'username');
      
      // Calculate quarterly stats for each user
      const userStats = {};
      
      // Initialize stats for all users
      users.forEach(user => {
        userStats[user._id.toString()] = {
          quarterlyGames: 0,
          quarterlyEloChange: 0,
          initialElo: null,
          currentElo: user.eloRating
        };
      });
      
      // Process games to calculate stats
      quarterGames.forEach(game => {
        // Process Team 1 players
        game.team1.forEach(playerData => {
          const playerId = playerData.player._id.toString();
          if (userStats[playerId]) {
            userStats[playerId].quarterlyGames++;
            userStats[playerId].quarterlyEloChange += playerData.eloChange;
            
            if (userStats[playerId].initialElo === null) {
              userStats[playerId].initialElo = playerData.eloBeforeGame;
            } else {
              if (playerData.eloBeforeGame < userStats[playerId].initialElo) {
                userStats[playerId].initialElo = playerData.eloBeforeGame;
              }
            }
          }
        });
        
        // Process Team 2 players
        game.team2.forEach(playerData => {
          const playerId = playerData.player._id.toString();
          if (userStats[playerId]) {
            userStats[playerId].quarterlyGames++;
            userStats[playerId].quarterlyEloChange += playerData.eloChange;
            
            if (userStats[playerId].initialElo === null) {
              userStats[playerId].initialElo = playerData.eloBeforeGame;
            } else {
              if (playerData.eloBeforeGame < userStats[playerId].initialElo) {
                userStats[playerId].initialElo = playerData.eloBeforeGame;
              }
            }
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
          initialElo: user.eloRating,
          currentElo: user.eloRating
        };
        
        // For users with no games in this quarter, use their current ELO as the initial ELO
        if (stats.initialElo === null) {
          stats.initialElo = user.eloRating;
        }
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const isInactive = user.lastActivity < sevenDaysAgo;
        
        rankings.push({
          user,
          isInactive,
          quarterlyGames: stats.quarterlyGames,
          quarterlyEloChange: stats.quarterlyEloChange,
          initialQuarterElo: stats.initialElo
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
      const months = ['Januar', 'April', 'Juli', 'Oktober'];
      const quarterName = `${months[currentQuarter]} - ${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
      
      res.render('index', {
        title: 'Padel Rankings',
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