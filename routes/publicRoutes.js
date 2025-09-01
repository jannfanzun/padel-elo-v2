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
      .select('username eloRating lastActivity profileImage');
    
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
      const startELO = quarterlyELOMap.has(userId) ? 
        quarterlyELOMap.get(userId) : user.eloRating;
      
      userStats[userId] = {
        quarterlyGames: 0,
        quarterlyEloChange: user.eloRating - startELO,
        initialQuarterElo: startELO,
        currentElo: user.eloRating,
        alltimeGames: 0 // Neu für All Time Spiele
      };
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
    
    // Für All Time Spiele: Zähle alle Spiele
    if (rankingType === 'alltime-games') {
      const allGames = await Game.find({}).populate('team1.player team2.player', 'username');
      
      allGames.forEach(game => {
        // Process Team 1 players
        game.team1.forEach(playerData => {
          const playerId = playerData.player._id.toString();
          if (userStats[playerId]) {
            userStats[playerId].alltimeGames++;
          }
        });
        
        // Process Team 2 players
        game.team2.forEach(playerData => {
          const playerId = playerData.player._id.toString();
          if (userStats[playerId]) {
            userStats[playerId].alltimeGames++;
          }
        });
      });
    }
    
    // Create rankings array with different sorting based on ranking type
    let rankings = [];
    
    users.forEach(user => {
      const userId = user._id.toString();
      const stats = userStats[userId] || { 
        quarterlyGames: 0, 
        quarterlyEloChange: 0,
        initialQuarterElo: user.eloRating,
        currentElo: user.eloRating,
        alltimeGames: 0
      };
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const isInactive = user.lastActivity < sevenDaysAgo;
      
      // Bestimme Shirt-Farbe und Level für All Time Spiele
      let shirtColor = 'white';
      let shirtLevel = 'Rookie';
      
      if (rankingType === 'alltime-games') {
        if (stats.alltimeGames >= 1000) {
          shirtColor = 'black';
          shirtLevel = 'Legend';
        } else if (stats.alltimeGames >= 750) {
          shirtColor = 'purple';
          shirtLevel = 'Master';
        } else if (stats.alltimeGames >= 500) {
          shirtColor = 'blue';
          shirtLevel = 'Expert';
        } else if (stats.alltimeGames >= 300) {
          shirtColor = 'green';
          shirtLevel = 'Advanced';
        } else if (stats.alltimeGames >= 150) {
          shirtColor = 'orange';
          shirtLevel = 'Experienced';
        } else if (stats.alltimeGames >= 90) {
          shirtColor = 'yellow';
          shirtLevel = 'Intermediate';
        } else if (stats.alltimeGames >= 30) {
          shirtColor = 'white';
          shirtLevel = 'Beginner';
        }
      }
      
      rankings.push({
        user,
        isInactive,
        quarterlyGames: stats.quarterlyGames,
        quarterlyEloChange: stats.quarterlyEloChange,
        initialQuarterElo: stats.initialQuarterElo,
        alltimeGames: stats.alltimeGames,
        shirtColor: shirtColor,
        shirtLevel: shirtLevel
      });
    });
    
    // Sort based on ranking type
    if (rankingType === 'quarterly-improvement') {
      rankings.sort((a, b) => b.quarterlyEloChange - a.quarterlyEloChange);
    } else if (rankingType === 'quarterly-games') {
      rankings.sort((a, b) => b.quarterlyGames - a.quarterlyGames);
    } else if (rankingType === 'alltime-games') {
      rankings.sort((a, b) => b.alltimeGames - a.alltimeGames);
    } else {
      // Default 'elo' sorting - already sorted by the database query
    }
    
    // Add rank property to each item
    rankings = rankings.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
    
    // Format quarter name for display
    const quarterStartMonths = ['Januar', 'April', 'Juli', 'Oktober'];
    const quarterEndMonths = ['März', 'Juni', 'September', 'Dezember'];
    const startMonth = quarterStartMonths[currentQuarter];
    const endMonth = quarterEndMonths[currentQuarter];
    const quarterName = `${startMonth} - ${endMonth} ${now.getFullYear()}`;
    
    res.render('index', {
      title: 'padELO Ranking',
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

/**
 * @desc    Show Dashboard TV (for Fire TV display in landscape mode)
 * @route   GET /dashboardTV
 * @access  Public
 */
router.get('/dashboardTV', async (req, res) => {
  try {
    // Get all users sorted by ELO rating (descending)
    const users = await User.find({ isAdmin: false }).sort({ eloRating: -1 });
    
    // Get current quarter information for stats calculation
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const quarterStart = new Date(currentYear, currentQuarter * 3, 1);
    const quarterEnd = new Date(currentYear, currentQuarter * 3 + 3, 0, 23, 59, 59, 999);

    // Ensure all users have quarterly ELO records
    await ensureAllUsersHaveQuarterlyRecords(now);
    
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
      const startELO = quarterlyELOMap.has(userId) ? 
        quarterlyELOMap.get(userId) : user.eloRating;
      
      userStats[userId] = {
        quarterlyGames: 0,
        quarterlyEloChange: user.eloRating - startELO,
        initialQuarterElo: startELO,
        currentElo: user.eloRating,
        alltimeGames: 0
      };
    });
    
    // Count quarterly games for each player
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

    // Calculate ranking with all time games focus (like the existing alltime-games ranking)
    let rankings = [];
    
    for (const user of users) {
      const userId = user._id.toString();
      const stats = userStats[userId] || { 
        quarterlyGames: 0, 
        quarterlyEloChange: 0,
        initialQuarterElo: user.eloRating,
        currentElo: user.eloRating,
        alltimeGames: 0
      };

      // Check if user is inactive (no activity in last 7 days)
      const isInactive = user.isInactive();
      
      // Get all time games count
      const alltimeGames = await Game.countDocuments({
        $or: [
          { 'team1.player': user._id },
          { 'team2.player': user._id }
        ]
      });
      
      // Determine shirt color and level based on all time games
      let shirtColor = 'white';
      let shirtLevel = 'Rookie';
      
      if (alltimeGames >= 1000) {
        shirtColor = 'black';
        shirtLevel = 'Legend';
      } else if (alltimeGames >= 750) {
        shirtColor = 'purple';
        shirtLevel = 'Master';
      } else if (alltimeGames >= 500) {
        shirtColor = 'blue';
        shirtLevel = 'Expert';
      } else if (alltimeGames >= 300) {
        shirtColor = 'green';
        shirtLevel = 'Advanced';
      } else if (alltimeGames >= 150) {
        shirtColor = 'orange';
        shirtLevel = 'Experienced';
      } else if (alltimeGames >= 90) {
        shirtColor = 'yellow';
        shirtLevel = 'Intermediate';
      } else if (alltimeGames >= 30) {
        shirtColor = 'white';
        shirtLevel = 'Beginner';
      }
      
      rankings.push({
        user,
        isInactive,
        alltimeGames,
        quarterlyGames: stats.quarterlyGames,
        quarterlyEloChange: stats.quarterlyEloChange,
        initialQuarterElo: stats.initialQuarterElo,
        shirtColor,
        shirtLevel
      });
    }
    
    // Sort by ELO rating (descending)
    rankings.sort((a, b) => b.user.eloRating - a.user.eloRating);

    // Find top improvement and most games for the award cards
    let topImprovement = null;
    let mostGames = null;

    // Filter out inactive users and those with no games for awards
    const activeRankings = rankings.filter(r => !r.isInactive);

    if (activeRankings.length > 0) {
      // Find best improvement (highest positive ELO change)
      const improvementRankings = activeRankings
        .filter(r => r.quarterlyEloChange > 0)
        .sort((a, b) => b.quarterlyEloChange - a.quarterlyEloChange);
      
      if (improvementRankings.length > 0) {
        topImprovement = improvementRankings[0];
      }

      // Find most games
      const gamesRankings = activeRankings
        .filter(r => r.quarterlyGames > 0)
        .sort((a, b) => b.quarterlyGames - a.quarterlyGames);
      
      if (gamesRankings.length > 0) {
        mostGames = gamesRankings[0];
      }
    }
    
    // Get recent games for display
    const recentGames = await Game.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('team1.player team2.player', 'username');
    
    // Render the dashboardTV view
    res.render('dashboardTV', {
      title: 'padELO TV Dashboard',
      rankings,
      recentGames,
      topImprovement,
      mostGames,
      user: null // Always null for public access
    });
  } catch (error) {
    console.error('Dashboard TV error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'An error occurred while loading the TV dashboard'
    });
  }
});

module.exports = router;