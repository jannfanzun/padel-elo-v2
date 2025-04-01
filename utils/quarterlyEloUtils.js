// Create a new file: utils/quarterlyEloUtils.js

const QuarterlyELO = require('../models/QuarterlyELO');
const User = require('../models/User');

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

module.exports = {
  getOrCreateQuarterlyELO,
  getCurrentQuarterELORecords,
  ensureAllUsersHaveQuarterlyRecords
};