const { ensureAllUsersHaveQuarterlyRecords } = require('./quarterlyEloUtils');
const { checkInactiveUsers } = require('./inactivityCheck');
const User = require('../models/User');
const Game = require('../models/Game');
const QuarterlyELO = require('../models/QuarterlyELO');
const { calculateEloForMatch } = require('./eloCalculator');

const initCronJobs = (app) => {
  /*
  // Check if this is a development environment
  const isDev = process.env.NODE_ENV !== 'production';
  
  // Schedule jobs
  scheduleDailyJobs();
  
  if (isDev) {
    console.log('Cron jobs initialized in development mode');
  } else {
    console.log('Cron jobs initialized in production mode');
  }
  */
  
  console.log('Cron jobs sind deaktiviert');
};

/**
 * Schedule jobs that should run daily
 */
const scheduleDailyJobs = () => {
  // Run at midnight every day
  const dailyJob = async () => {
    const now = new Date();
    console.log(`Running daily job at ${now.toISOString()}`);
    
    // Check if today is the first day of a new quarter
    if (isFirstDayOfQuarter(now)) {
      console.log('First day of a new quarter detected, initializing quarterly ELO records');
      await updateQuarterlyELORecords();
      
      // Add ELO recalculation for the previous quarter
      // console.log('Performing automatic ELO recalculation for the previous quarter');
      // await recalculateQuarterlyELO(getPreviousQuarter(now));
    }
    
    // Comment out the inactive users check
    // await checkInactiveUsers();
    
    // We can add more daily tasks here in the future
  };
  
  // Set up the daily job to run at midnight
  const runDailyJob = () => {
    const now = new Date();
    const night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // tomorrow
      0, 0, 0 // midnight
    );
    
    const msUntilMidnight = night.getTime() - now.getTime();
    
    // Schedule the first run
    setTimeout(() => {
      dailyJob(); // Run the job
      
      // Then schedule it to run daily
      setInterval(dailyJob, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
    
    // Also run once at startup to catch any missed updates
    dailyJob();
  };
  
  // Start the scheduler
  runDailyJob();
};

/**
 * Check if a date is the first day of a quarter
 * @param {Date} date - Date to check
 * @returns {boolean} - True if it's the first day of a quarter
 */
const isFirstDayOfQuarter = (date) => {
  const day = date.getDate();
  const month = date.getMonth();
  
  // Quarters start on January 1st, April 1st, July 1st, October 1st
  return day === 1 && (month === 0 || month === 3 || month === 6 || month === 9);
};

/**
 * Get previous quarter information (year and quarter number)
 * @param {Date} date - Current date
 * @returns {Object} - Object with year and quarter
 */
const getPreviousQuarter = (date) => {
  let year = date.getFullYear();
  let quarter = Math.floor(date.getMonth() / 3) - 1;
  
  // Handle year transition
  if (quarter < 0) {
    year -= 1;
    quarter = 3; // Q4 of previous year
  }
  
  return { year, quarter };
};

/**
 * Update quarterly ELO records for all users
 */
const updateQuarterlyELORecords = async () => {
  try {
    await ensureAllUsersHaveQuarterlyRecords();
    console.log('Quarterly ELO records updated successfully');
  } catch (error) {
    console.error('Error updating quarterly ELO records:', error);
  }
};

/**
 * Recalculate ELO ratings for a specific quarter
 * @param {Object} quarterInfo - Object with year and quarter
 */
const recalculateQuarterlyELO = async (quarterInfo) => {
  try {
    const { year, quarter } = quarterInfo;
    console.log(`Starting automatic ELO recalculation for Q${quarter + 1}/${year}`);
    
    // Calculate quarter start and end dates
    const quarterStart = new Date(year, quarter * 3, 1);
    const quarterEnd = new Date(year, (quarter + 1) * 3, 0); // Last day of the quarter
    
    // Get all games in this quarter, sorted by creation date (oldest first)
    const games = await Game.find({
      createdAt: { $gte: quarterStart, $lte: quarterEnd }
    })
    .sort({ createdAt: 1 })
    .populate('team1.player team2.player', 'username eloRating');
    
    if (games.length === 0) {
      console.log(`No games found in Q${quarter + 1}/${year}`);
      return;
    }
    
    console.log(`Found ${games.length} games to recalculate in Q${quarter + 1}/${year}`);
    
    // Get all players who participated in games this quarter
    const playerIds = new Set();
    games.forEach(game => {
      game.team1.forEach(player => playerIds.add(player.player._id.toString()));
      game.team2.forEach(player => playerIds.add(player.player._id.toString()));
    });
    
    // Get quarterly ELO records for all players
    const quarterlyRecords = await QuarterlyELO.find({
      user: { $in: Array.from(playerIds) },
      year,
      quarter
    });
    
    // Create map for quick access to quarterly starting ELO
    const quarterlyELOMap = new Map();
    quarterlyRecords.forEach(record => {
      quarterlyELOMap.set(record.user.toString(), record.startELO);
    });
    
    // Reset all player ELO ratings to their quarterly starting values
    for (const playerId of playerIds) {
      const startELO = quarterlyELOMap.get(playerId) || 500; // Fallback to default ELO
      await User.findByIdAndUpdate(playerId, { eloRating: startELO });
      console.log(`Reset player ${playerId} to ${startELO} ELO`);
    }
    
    // Process each game in chronological order
    for (const game of games) {
      // Get updated player information after previous game calculations
      const playersInfo = await getPlayersInfo(game);
      
      // Calculate new ELO changes
      const eloResults = recalculateGameELO(playersInfo, game.score);
      
      // Update game record with new calculations
      game.team1.forEach((player, index) => {
        player.eloBeforeGame = eloResults.team1[index].eloBeforeGame;
        player.eloAfterGame = eloResults.team1[index].eloAfterGame;
        player.eloChange = eloResults.team1[index].eloChange;
      });
      
      game.team2.forEach((player, index) => {
        player.eloBeforeGame = eloResults.team2[index].eloBeforeGame;
        player.eloAfterGame = eloResults.team2[index].eloAfterGame;
        player.eloChange = eloResults.team2[index].eloChange;
      });
      
      game.teamElo = eloResults.teamElo;
      
      // Save updated game record
      await game.save();
      
      // Update all players' ELO ratings
      await User.findByIdAndUpdate(game.team1[0].player._id, { 
        eloRating: eloResults.team1[0].eloAfterGame
      });
      
      await User.findByIdAndUpdate(game.team1[1].player._id, { 
        eloRating: eloResults.team1[1].eloAfterGame
      });
      
      await User.findByIdAndUpdate(game.team2[0].player._id, { 
        eloRating: eloResults.team2[0].eloAfterGame
      });
      
      await User.findByIdAndUpdate(game.team2[1].player._id, { 
        eloRating: eloResults.team2[1].eloAfterGame
      });
      
      console.log(`Recalculated ELO for game ${game._id}`);
    }
    
    console.log(`ELO recalculation for Q${quarter + 1}/${year} completed successfully`);
  } catch (error) {
    console.error(`Error recalculating ELO for quarter:`, error);
  }
};

/**
 * Helper function to get updated player information for a game
 * @param {Object} game - Game object with populated player references
 * @returns {Object} - Object containing current player information for ELO calculation
 */
async function getPlayersInfo(game) {
  // Get current player data from database
  const player1 = await User.findById(game.team1[0].player._id);
  const player2 = await User.findById(game.team1[1].player._id);
  const player3 = await User.findById(game.team2[0].player._id);
  const player4 = await User.findById(game.team2[1].player._id);
  
  return {
    team1: {
      player1: player1,
      player2: player2
    },
    team2: {
      player1: player3,
      player2: player4
    }
  };
}

/**
 * Recalculate ELO for a game using current player ELO values
 * @param {Object} playersInfo - Current player information
 * @param {Object} score - Score object with team1 and team2 scores
 * @returns {Object} - Calculated ELO results
 */
function recalculateGameELO(playersInfo, score) {
  const { calculateEloForMatch } = require('./eloCalculator');
  return calculateEloForMatch(playersInfo.team1, playersInfo.team2, score);
}

module.exports = {
  initCronJobs,
  recalculateQuarterlyELO  // Export this so it can be used by the admin controller
};