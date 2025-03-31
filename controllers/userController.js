const User = require('../models/User');
const Game = require('../models/Game');
const QuarterlyELO = require('../models/QuarterlyELO');
const moment = require('moment');
const { ensureAllUsersHaveQuarterlyRecords } = require('../utils/quarterlyEloUtils');

// @desc    Show user profile
// @route   GET /user/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user with rank
    const user = req.user;
    const rank = await user.getRank();
    
    // Get Letzte Spiele
    const recentGames = await Game.find({
      $or: [
        { 'team1.player': userId },
        { 'team2.player': userId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('team1.player team2.player', 'username');
    
    // Get stats
    const gamesPlayed = await Game.countDocuments({
      $or: [
        { 'team1.player': userId },
        { 'team2.player': userId }
      ]
    });
    
    const gamesWonTeam1 = await Game.countDocuments({
      'team1.player': userId,
      'winner': 'team1'
    });
    
    const gamesWonTeam2 = await Game.countDocuments({
      'team2.player': userId,
      'winner': 'team2'
    });
    
    const gamesWon = gamesWonTeam1 + gamesWonTeam2;
    const winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : 0;
    
    // Check if inactive
    const isInactive = user.isInactive();
    
    res.render('user/profile', {
      title: 'My Profile',
      user,
      rank,
      recentGames,
      stats: {
        gamesPlayed,
        gamesWon,
        winRate,
        isInactive
      },
      moment
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'An error occurred while loading the profile'
    });
  }
};

// @desc    Show rankings
// @route   GET /user/rankings
// @access  Private
exports.getRankings = async (req, res) => {
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
      
      const isInactive = user.isInactive();
      
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
    const months = ['Januar', 'April', 'Juli', 'Oktober'];
    const quarterName = `${months[currentQuarter]} - ${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    
    res.render('user/rankings', {
      title: 'Rankings',
      rankings,
      rankingType,
      quarterName,
      quarterStart,
      moment
    });
  } catch (error) {
    console.error('Get rankings error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'An error occurred while loading the rankings'
    });
  }
};