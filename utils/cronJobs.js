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
 * Recalculate ELO ratings for a specific quarter (used by cron jobs)
 */
const recalculateQuarterlyELO = async (quarterInfo) => {
  // Delegate to full recalculation to ensure consistency
  await recalculateAllELO();
};

/**
 * Full recalculation of ALL ELO ratings from scratch.
 * Optimized: all calculations in-memory, then batch-write to DB.
 * ~5 DB operations instead of ~2000+ sequential ones.
 */
const recalculateAllELO = async () => {
  const DEFAULT_ELO = 500;
  console.log('Starting FULL ELO recalculation from scratch...');

  // Step 1: Single DB read - get ALL games sorted chronologically
  const games = await Game.find({}).sort({ createdAt: 1 }).lean();
  console.log(`Found ${games.length} total games to recalculate`);

  // Step 2: Collect all player IDs
  const playerIds = new Set();
  games.forEach(game => {
    game.team1.forEach(p => playerIds.add(p.player.toString()));
    game.team2.forEach(p => playerIds.add(p.player.toString()));
  });

  // Step 3: In-memory ELO tracker
  const currentElo = new Map();
  for (const playerId of playerIds) {
    currentElo.set(playerId, DEFAULT_ELO);
  }

  // Step 4: QuarterlyELO tracking
  const quarterlyRecordsCreated = new Set();
  const quarterlyRecordsToInsert = [];

  const getQuarterInfo = (playerId, date) => {
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3);
    return { key: `${playerId}-${year}-${quarter}`, year, quarter };
  };

  // Step 5: Batch of game updates to write
  const gameUpdates = [];

  // Step 6: Process each game in chronological order (pure calculation, no DB)
  for (const game of games) {
    const p1Id = game.team1[0].player.toString();
    const p2Id = game.team1[1].player.toString();
    const p3Id = game.team2[0].player.toString();
    const p4Id = game.team2[1].player.toString();

    // Track quarterly records
    for (const playerId of [p1Id, p2Id, p3Id, p4Id]) {
      const { key, year, quarter } = getQuarterInfo(playerId, game.createdAt);
      if (!quarterlyRecordsCreated.has(key)) {
        quarterlyRecordsToInsert.push({
          user: playerId,
          year,
          quarter,
          startELO: currentElo.get(playerId)
        });
        quarterlyRecordsCreated.add(key);
      }
    }

    // Build team objects with current in-memory ELO
    const team1 = {
      player1: { _id: game.team1[0].player, eloRating: currentElo.get(p1Id) },
      player2: { _id: game.team1[1].player, eloRating: currentElo.get(p2Id) }
    };
    const team2 = {
      player1: { _id: game.team2[0].player, eloRating: currentElo.get(p3Id) },
      player2: { _id: game.team2[1].player, eloRating: currentElo.get(p4Id) }
    };

    // Calculate ELO (pure math, no DB)
    const eloResults = calculateEloForMatch(team1, team2, game.score);

    // Queue game update for batch write
    gameUpdates.push({
      updateOne: {
        filter: { _id: game._id },
        update: {
          $set: {
            'team1.0.eloBeforeGame': eloResults.team1[0].eloBeforeGame,
            'team1.0.eloAfterGame': eloResults.team1[0].eloAfterGame,
            'team1.0.eloChange': eloResults.team1[0].eloChange,
            'team1.1.eloBeforeGame': eloResults.team1[1].eloBeforeGame,
            'team1.1.eloAfterGame': eloResults.team1[1].eloAfterGame,
            'team1.1.eloChange': eloResults.team1[1].eloChange,
            'team2.0.eloBeforeGame': eloResults.team2[0].eloBeforeGame,
            'team2.0.eloAfterGame': eloResults.team2[0].eloAfterGame,
            'team2.0.eloChange': eloResults.team2[0].eloChange,
            'team2.1.eloBeforeGame': eloResults.team2[1].eloBeforeGame,
            'team2.1.eloAfterGame': eloResults.team2[1].eloAfterGame,
            'team2.1.eloChange': eloResults.team2[1].eloChange,
            'teamElo': eloResults.teamElo,
            'winner': eloResults.winner
          }
        }
      }
    });

    // Update in-memory ELO tracker
    currentElo.set(p1Id, eloResults.team1[0].eloAfterGame);
    currentElo.set(p2Id, eloResults.team1[1].eloAfterGame);
    currentElo.set(p3Id, eloResults.team2[0].eloAfterGame);
    currentElo.set(p4Id, eloResults.team2[1].eloAfterGame);
  }

  // Step 7: Batch-write everything to DB (few large operations instead of many small ones)

  // 7a: Delete old QuarterlyELO records
  await QuarterlyELO.deleteMany({ user: { $in: Array.from(playerIds) } });

  // 7b: Insert new QuarterlyELO records in one batch
  if (quarterlyRecordsToInsert.length > 0) {
    await QuarterlyELO.insertMany(quarterlyRecordsToInsert);
  }

  // 7c: Batch-update all games (bulkWrite handles up to 100k ops)
  if (gameUpdates.length > 0) {
    await Game.bulkWrite(gameUpdates);
  }

  // 7d: Batch-update all user ELO ratings
  const userUpdates = Array.from(currentElo).map(([playerId, elo]) => ({
    updateOne: {
      filter: { _id: playerId },
      update: { $set: { eloRating: elo } }
    }
  }));
  if (userUpdates.length > 0) {
    await User.bulkWrite(userUpdates);
  }

  console.log(`FULL ELO recalculation completed. Processed ${games.length} games for ${playerIds.size} players.`);
};

module.exports = {
  initCronJobs,
  recalculateQuarterlyELO,
  recalculateAllELO,
  getPreviousQuarter,
  distributeQuarterlyAwards,
  sendQuarterlyReport
};
