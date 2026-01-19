// Create a new file: utils/quarterlyEloUtils.js

const QuarterlyELO = require('../models/QuarterlyELO');
const User = require('../models/User');
const Game = require('../models/Game');

/**
 * Get or create quarterly ELO record for a user
 * @param {ObjectId} userId - User ID
 * @param {Date} [date=new Date()] - Date to determine the quarter (defaults to current date)
 * @returns {Promise<Object>} - Quarterly ELO record
 */
const getOrCreateQuarterlyELO = async (userId, date = new Date()) => {
  // Calculate current quarter and year
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3);
  
  // Try to find existing record
  let quarterlyELO = await QuarterlyELO.findOne({
    user: userId,
    year,
    quarter
  });
  
  // If record doesn't exist, create a new one with current ELO
  if (!quarterlyELO) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Benutzer nicht gefunden');
    }
    
    quarterlyELO = await QuarterlyELO.create({
      user: userId,
      year,
      quarter,
      startELO: user.eloRating
    });
  }
  
  return quarterlyELO;
};

/**
 * Get quarterly ELO records for all users in current quarter
 * @param {Date} [date=new Date()] - Date to determine the quarter
 * @returns {Promise<Array>} - Array of quarterly ELO records
 */
const getCurrentQuarterELORecords = async (date = new Date()) => {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3);
  
  return QuarterlyELO.find({ year, quarter }).populate('user');
};

/**
 * Ensure all users have quarterly ELO records (for cron job)
 * @param {Date} [date=new Date()] - Date to determine the quarter
 * @returns {Promise<void>}
 */
const ensureAllUsersHaveQuarterlyRecords = async (date = new Date()) => {
  // Get all users (excluding admins)
  const users = await User.find({ isAdmin: false });
  
  // Get current quarter info
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3);
  
  // Process each user
  const promises = users.map(async (user) => {
    // Check if record exists
    const exists = await QuarterlyELO.findOne({
      user: user._id,
      year,
      quarter
    });
    
    // If not, create one
    if (!exists) {
      await QuarterlyELO.create({
        user: user._id,
        year,
        quarter,
        startELO: user.eloRating
      });
    }
  });
  
  await Promise.all(promises);
};

/**
 * Get quarterly report data for a specific quarter
 * @param {number} year - Year
 * @param {number} quarter - Quarter (0-3)
 * @returns {Promise<Object>} - Report data with player stats
 */
const getQuarterlyReportData = async (year, quarter) => {
  // Calculate quarter start and end dates
  const quarterStart = new Date(year, quarter * 3, 1);
  const quarterEnd = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59); // Last day of the quarter

  // Get all quarterly ELO records for this quarter
  const quarterlyRecords = await QuarterlyELO.find({
    year,
    quarter
  }).populate('user', 'username eloRating');

  // Get all games in this quarter
  const games = await Game.find({
    createdAt: { $gte: quarterStart, $lte: quarterEnd }
  });

  // Count games per player
  const gamesPerPlayer = new Map();
  games.forEach(game => {
    [...game.team1, ...game.team2].forEach(playerData => {
      const playerId = playerData.player.toString();
      gamesPerPlayer.set(playerId, (gamesPerPlayer.get(playerId) || 0) + 1);
    });
  });

  // Build player stats
  const players = quarterlyRecords
    .filter(record => record.user && !record.user.isAdmin)
    .map(record => {
      const playerId = record.user._id.toString();
      const endELO = record.user.eloRating;
      const startELO = record.startELO;
      const eloChange = endELO - startELO;
      const gamesPlayed = gamesPerPlayer.get(playerId) || 0;

      return {
        username: record.user.username,
        startELO,
        endELO,
        eloChange,
        gamesPlayed
      };
    })
    .sort((a, b) => b.endELO - a.endELO); // Sort by end ELO descending

  return {
    year,
    quarter,
    players,
    totalGames: games.length
  };
};

module.exports = {
  getOrCreateQuarterlyELO,
  getCurrentQuarterELORecords,
  ensureAllUsersHaveQuarterlyRecords,
  getQuarterlyReportData
};