const User = require('../models/User');
const Game = require('../models/Game');
const moment = require('moment');

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
    // Get all users (excluding admin)
    const users = await User.find({ isAdmin: false })
      .sort({ eloRating: -1 })
      .select('username eloRating lastActivity');
    
    const rankings = users.map((user, index) => {
      const isInactive = user.isInactive();
      
      return {
        rank: index + 1,
        user,
        isInactive
      };
    });
    
    res.render('user/rankings', {
      title: 'Rankings',
      rankings,
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