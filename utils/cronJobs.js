const User = require('../models/User');
const Game = require('../models/Game');
const QuarterlyELO = require('../models/QuarterlyELO');
const { calculateEloForMatch } = require('./eloCalculator');
const { getAwardInfo } = require('./awardUtils');
const { getQuarterlyReportData } = require('./quarterlyEloUtils');
const { sendQuarterlyReportEmail } = require('../config/email');

const initCronJobs = (app) => {
  scheduleDailyJobs();
  console.log('Cron jobs aktiviert - Quarterly Awards & Report am 1. Jan/Apr/Jul/Okt');
};

/**
 * Schedule jobs that should run daily
 */
const scheduleDailyJobs = () => {
  const dailyJob = async () => {
    const now = new Date();
    console.log(`Running daily job at ${now.toISOString()}`);

    // Check if today is the first day of a new quarter
    if (isFirstDayOfQuarter(now)) {
      console.log('First day of a new quarter detected');
      const previousQuarter = getPreviousQuarter(now);

      // Distribute awards for the previous quarter
      await distributeQuarterlyAwards(previousQuarter);

      // Send quarterly report email
      await sendQuarterlyReport(previousQuarter);
    }
  };

  // Set up the daily job to run at midnight
  const runDailyJob = () => {
    const now = new Date();
    const night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0, 0, 0
    );

    const msUntilMidnight = night.getTime() - now.getTime();

    setTimeout(() => {
      dailyJob();
      setInterval(dailyJob, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    // Run once at startup to catch any missed updates
    dailyJob();
  };

  runDailyJob();
};

/**
 * Check if a date is the first day of a quarter
 */
const isFirstDayOfQuarter = (date) => {
  const day = date.getDate();
  const month = date.getMonth();
  return day === 1 && (month === 0 || month === 3 || month === 6 || month === 9);
};

/**
 * Get previous quarter information
 */
const getPreviousQuarter = (date) => {
  let year = date.getFullYear();
  let quarter = Math.floor(date.getMonth() / 3) - 1;

  if (quarter < 0) {
    year -= 1;
    quarter = 3;
  }

  return { year, quarter };
};

/**
 * Automatically distribute quarterly awards
 */
const distributeQuarterlyAwards = async (quarterInfo) => {
  try {
    const { year, quarter } = quarterInfo;
    const quarterLabel = `Q${quarter + 1}`;
    console.log(`Distributing awards for ${quarterLabel}/${year}`);

    const quarterStart = new Date(year, quarter * 3, 1);
    const quarterEnd = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59, 999);

    const users = await User.find({ isAdmin: false });

    if (users.length === 0) {
      console.log('No users found for award distribution');
      return;
    }

    const quarterlyRecords = await QuarterlyELO.find({ year, quarter });
    const quarterlyELOMap = new Map();
    quarterlyRecords.forEach(record => {
      quarterlyELOMap.set(record.user.toString(), record.startELO);
    });

    const quarterGames = await Game.find({
      createdAt: { $gte: quarterStart, $lte: quarterEnd }
    });

    const userStats = [];

    for (const user of users) {
      const userId = user._id.toString();
      const startELO = quarterlyELOMap.get(userId) || user.eloRating;
      const eloImprovement = user.eloRating - startELO;

      let quarterlyGames = 0;
      quarterGames.forEach(game => {
        const inTeam1 = game.team1.some(p => p.player.toString() === userId);
        const inTeam2 = game.team2.some(p => p.player.toString() === userId);
        if (inTeam1 || inTeam2) {
          quarterlyGames++;
        }
      });

      userStats.push({
        user,
        eloImprovement,
        quarterlyGames,
        currentElo: user.eloRating
      });
    }

    const awardsToGrant = [];

    // Best Improvement - alle mit gleichem Bestwert
    const improvementCandidates = userStats
      .filter(s => s.eloImprovement > 0 && s.quarterlyGames > 0)
      .sort((a, b) => b.eloImprovement - a.eloImprovement);

    if (improvementCandidates.length > 0) {
      const bestValue = improvementCandidates[0].eloImprovement;
      improvementCandidates
        .filter(s => s.eloImprovement === bestValue)
        .forEach(s => {
          awardsToGrant.push({
            user: s.user,
            type: 'best_improvement',
            value: s.eloImprovement
          });
        });
    }

    // Most Games - alle mit gleichem Bestwert
    const gamesCandidates = userStats
      .filter(s => s.quarterlyGames > 0)
      .sort((a, b) => b.quarterlyGames - a.quarterlyGames);

    if (gamesCandidates.length > 0) {
      const bestValue = gamesCandidates[0].quarterlyGames;
      gamesCandidates
        .filter(s => s.quarterlyGames === bestValue)
        .forEach(s => {
          awardsToGrant.push({
            user: s.user,
            type: 'most_games',
            value: s.quarterlyGames
          });
        });
    }

    // Best ELO - alle mit gleichem Bestwert
    const eloCandidates = userStats
      .filter(s => s.quarterlyGames > 0)
      .sort((a, b) => b.currentElo - a.currentElo);

    if (eloCandidates.length > 0) {
      const bestValue = eloCandidates[0].currentElo;
      eloCandidates
        .filter(s => s.currentElo === bestValue)
        .forEach(s => {
          awardsToGrant.push({
            user: s.user,
            type: 'best_elo',
            value: s.currentElo
          });
        });
    }

    // Grant awards
    for (const award of awardsToGrant) {
      const existingAward = award.user.awards?.find(
        a => a.type === award.type && a.quarter === quarterLabel && a.year === year
      );

      if (!existingAward) {
        if (!award.user.awards) {
          award.user.awards = [];
        }

        award.user.awards.push({
          type: award.type,
          quarter: quarterLabel,
          year: year,
          awardedAt: new Date()
        });

        await award.user.save();

        const awardInfo = getAwardInfo(award.type);
        console.log(`Awarded "${awardInfo.name}" to ${award.user.username} (${award.value}) for ${quarterLabel}/${year}`);
      } else {
        console.log(`${award.user.username} already has ${award.type} award for ${quarterLabel}/${year}`);
      }
    }

    console.log(`Award distribution for ${quarterLabel}/${year} completed`);
  } catch (error) {
    console.error('Error distributing quarterly awards:', error);
  }
};

/**
 * Send quarterly report email to admin
 */
const sendQuarterlyReport = async (quarterInfo) => {
  try {
    const { year, quarter } = quarterInfo;
    console.log(`Generating quarterly report for Q${quarter + 1}/${year}`);

    const reportData = await getQuarterlyReportData(year, quarter);

    if (reportData.players.length === 0) {
      console.log(`No players found for Q${quarter + 1}/${year}, skipping report email`);
      return;
    }

    await sendQuarterlyReportEmail(reportData);
    console.log(`Quarterly report email sent for Q${quarter + 1}/${year}`);
  } catch (error) {
    console.error('Error sending quarterly report:', error);
  }
};

/**
 * Recalculate ELO ratings for a specific quarter (used by admin)
 */
const recalculateQuarterlyELO = async (quarterInfo) => {
  try {
    const { year, quarter } = quarterInfo;
    console.log(`Starting ELO recalculation for Q${quarter + 1}/${year}`);

    const quarterStart = new Date(year, quarter * 3, 1);
    const quarterEnd = new Date(year, (quarter + 1) * 3, 0);

    const games = await Game.find({
      createdAt: { $gte: quarterStart, $lte: quarterEnd }
    })
    .sort({ createdAt: 1 })
    .populate('team1.player team2.player', 'username eloRating');

    if (games.length === 0) {
      console.log(`No games found in Q${quarter + 1}/${year}`);
      return;
    }

    console.log(`Found ${games.length} games to recalculate`);

    const playerIds = new Set();
    games.forEach(game => {
      game.team1.forEach(player => playerIds.add(player.player._id.toString()));
      game.team2.forEach(player => playerIds.add(player.player._id.toString()));
    });

    const quarterlyRecords = await QuarterlyELO.find({
      user: { $in: Array.from(playerIds) },
      year,
      quarter
    });

    const quarterlyELOMap = new Map();
    quarterlyRecords.forEach(record => {
      quarterlyELOMap.set(record.user.toString(), record.startELO);
    });

    // Reset players to quarterly starting ELO
    for (const playerId of playerIds) {
      const startELO = quarterlyELOMap.get(playerId) || 500;
      await User.findByIdAndUpdate(playerId, { eloRating: startELO });
    }

    // Process each game
    for (const game of games) {
      const player1 = await User.findById(game.team1[0].player._id);
      const player2 = await User.findById(game.team1[1].player._id);
      const player3 = await User.findById(game.team2[0].player._id);
      const player4 = await User.findById(game.team2[1].player._id);

      const playersInfo = {
        team1: { player1, player2 },
        team2: { player1: player3, player2: player4 }
      };

      const eloResults = calculateEloForMatch(playersInfo.team1, playersInfo.team2, game.score);

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
      await game.save();

      await User.findByIdAndUpdate(game.team1[0].player._id, { eloRating: eloResults.team1[0].eloAfterGame });
      await User.findByIdAndUpdate(game.team1[1].player._id, { eloRating: eloResults.team1[1].eloAfterGame });
      await User.findByIdAndUpdate(game.team2[0].player._id, { eloRating: eloResults.team2[0].eloAfterGame });
      await User.findByIdAndUpdate(game.team2[1].player._id, { eloRating: eloResults.team2[1].eloAfterGame });
    }

    console.log(`ELO recalculation for Q${quarter + 1}/${year} completed`);
  } catch (error) {
    console.error('Error recalculating ELO:', error);
  }
};

module.exports = {
  initCronJobs,
  recalculateQuarterlyELO,
  getPreviousQuarter,
  distributeQuarterlyAwards,
  sendQuarterlyReport
};
