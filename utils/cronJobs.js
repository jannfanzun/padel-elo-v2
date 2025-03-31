// Create a new file: utils/cronJobs.js

const { ensureAllUsersHaveQuarterlyRecords } = require('./quarterlyEloUtils');

/**
 * Initialize all cron jobs
 * @param {Object} app - Express app instance
 */
const initCronJobs = (app) => {
  // Check if this is a development environment
  const isDev = process.env.NODE_ENV !== 'production';
  
  // Schedule jobs
  scheduleDailyJobs();
  
  if (isDev) {
    console.log('Cron jobs initialized in development mode');
  } else {
    console.log('Cron jobs initialized in production mode');
  }
};

/**
 * Schedule jobs that should run daily
 */
const scheduleDailyJobs = () => {
  // Run at midnight every day
  const dailyJob = async () => {
    const now = new Date();
    
    // Check if today is the first day of a new quarter
    if (isFirstDayOfQuarter(now)) {
      console.log('First day of a new quarter detected, initializing quarterly ELO records');
      await updateQuarterlyELORecords();
    }
    
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

module.exports = {
  initCronJobs
};