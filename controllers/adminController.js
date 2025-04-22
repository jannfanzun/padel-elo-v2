const mongoose = require('mongoose');
const User = require('../models/User');
const Game = require('../models/Game');
const RegistrationRequest = require('../models/RegistrationRequest');
const GameReport = require('../models/GameReport');
const QuarterlyELO = require('../models/QuarterlyELO');
const moment = require('moment');
const { sendRegistrationApprovedEmail } = require('../config/email');
const { recalculateQuarterlyELO } = require('../utils/cronJobs');


// @desc    Admin dashboard
// @route   GET /admin/dashboard
// @access  Private (Admin only)
exports.getDashboard = async (req, res) => {
  try {
    // Get counts
    const userCount = await User.countDocuments({ isAdmin: false });
    const gameCount = await Game.countDocuments();
    const pendingRequestsCount = await RegistrationRequest.countDocuments({ status: 'pending' });
    
    // Get Letzte Spiele - limit to 5
    const recentGames = await Game.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('team1.player team2.player createdBy', 'username');
    
    // Get recently registered users - limit to 5
    const recentUsers = await User.find({ isAdmin: false })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: {
        userCount,
        gameCount,
        pendingRequestsCount
      },
      recentGames,
      recentUsers,
      moment
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'An error occurred while loading the dashboard'
    });
  }
};

// @desc    Manage users
// @route   GET /admin/users
// @access  Private (Admin only)
exports.manageUsers = async (req, res) => {
  try {
    // Get query parameters
    const { search, page = 1, limit = 10 } = req.query;
    
    // Convert page and limit to numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    // Build query
    let query = { isAdmin: false };
    
    if (search) {
      query = {
        ...query,
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Count total documents for pagination
    const total = await User.countDocuments(query);
    
    // Calculate total pages
    const totalPages = Math.ceil(total / limitNum);
    
    // Get users with pagination
    const users = await User.find(query)
      .sort({ username: 1 })
      .skip(skip)
      .limit(limitNum);
    
    res.render('admin/users', {
      title: 'Spieler verwalten',
      users,
      search,
      moment,
      success: req.query.success || null,
      error: req.query.error || null,
      currentPage: pageNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      total
    });
  } catch (error) {
    console.error('Manage users error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'An error occurred while loading the users'
    });
  }
};

// @desc    Delete user
// @route   POST /admin/users/:id/delete
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find user
    const user = await User.findById(id);
    
    if (!user) {
      return res.redirect('/admin/users?error=Benutzer nicht gefunden');
    }
    
    if (user.isAdmin) {
      return res.redirect('/admin/users?error=Admin-Benutzer kann nicht gelöscht werden');
    }
    
    // Check if user has games
    const gamesCount = await Game.countDocuments({
      $or: [
        { 'team1.player': id },
        { 'team2.player': id }
      ]
    });
    
    if (gamesCount > 0) {
      return res.redirect('/admin/users?error=Benutzer mit Spielen kann nicht gelöscht werden. Lösche zuerst die Spiele.');
    }
    
    // Delete user
    await User.findByIdAndDelete(id);
    
    res.redirect('/admin/users?success=Benutzer erfolgreich gelöscht');
  } catch (error) {
    console.error('Delete user error:', error);
    res.redirect('/admin/users?error=Server error');
  }
};

// @desc    Manage games
// @route   GET /admin/games
// @access  Private (Admin only)
exports.manageGames = async (req, res) => {
  try {
    // Get query parameters
    const { userId, search, page = 1, limit = 10 } = req.query;
    
    // Convert page and limit to numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    // Build query
    let query = {};
    
    // Filter by user if provided
    if (userId) {
      query = {
        $or: [
          { 'team1.player': userId },
          { 'team2.player': userId }
        ]
      };
    }
    
    // If search term is provided, get user ids that match the search
    if (search) {
      const matchingUsers = await User.find({
        username: { $regex: search, $options: 'i' },
        isAdmin: false
      }).select('_id');
      
      const userIds = matchingUsers.map(user => user._id);
      
      // If we already have a userId filter, combine with search
      if (userId) {
        // If the search doesn't match the selected user, return no results
        if (!userIds.some(id => id.toString() === userId)) {
          return res.render('admin/games', {
            title: 'Spiele verwalten',
            games: [],
            users: await User.find({ isAdmin: false }).sort({ username: 1 }).select('username'),
            selectedUserId: userId,
            search,
            moment,
            success: req.query.success || null,
            error: req.query.error || null,
            currentPage: pageNum,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false
          });
        }
      } else if (userIds.length > 0) {
        // Add search filter
        query = {
          $or: [
            { 'team1.player': { $in: userIds } },
            { 'team2.player': { $in: userIds } }
          ]
        };
      } else {
        // No matching users found, return no results
        return res.render('admin/games', {
          title: 'Spiele verwalten',
          games: [],
          users: await User.find({ isAdmin: false }).sort({ username: 1 }).select('username'),
          selectedUserId: userId,
          search,
          moment,
          success: req.query.success || null,
          error: req.query.error || null,
          currentPage: pageNum,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        });
      }
    }
    
    // Count total documents for pagination
    const total = await Game.countDocuments(query);
    
    // Calculate total pages
    const totalPages = Math.ceil(total / limitNum);
    
    // Get games with pagination
    const games = await Game.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('team1.player team2.player createdBy', 'username');
    
    // Get all users for filter
    const users = await User.find({ isAdmin: false })
      .sort({ username: 1 })
      .select('username');
    
    res.render('admin/games', {
      title: 'Spiele verwalten',
      games,
      users,
      selectedUserId: userId,
      search,
      moment,
      success: req.query.success || null,
      error: req.query.error || null,
      currentPage: pageNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      total
    });
  } catch (error) {
    console.error('Manage games error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'An error occurred while loading the games'
    });
  }
};

// @desc    Delete game
// @route   POST /admin/games/:id/delete
// @access  Private (Admin only)
exports.deleteGame = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find game
    const game = await Game.findById(id);
    
    if (!game) {
      return res.redirect('/admin/games?error=Spiel nicht gefunden');
    }
    
    // Reverse ELO changes for all players
    for (const player of game.team1) {
      await User.findByIdAndUpdate(player.player, {
        eloRating: player.eloBeforeGame
      });
    }
    
    for (const player of game.team2) {
      await User.findByIdAndUpdate(player.player, {
        eloRating: player.eloBeforeGame
      });
    }
    
    // Delete any reports associated with this game
    await GameReport.deleteMany({ game: id });
    
    // Delete game
    await Game.findByIdAndDelete(id);
    
    const redirectUrl = req.query.userId 
      ? `/admin/games?userId=${req.query.userId}&success=Spiel erfolgreich gelöscht` 
      : '/admin/games?success=Spiel erfolgreich gelöscht';
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Delete game error:', error);
    res.redirect('/admin/games?error=Server error');
  }
};

// @desc    Manage registration requests
// @route   GET /admin/registration-requests
// @access  Private (Admin only)
exports.getRegistrationRequests = async (req, res) => {
  try {
    // Get query parameters
    const { page = 1, limit = 10 } = req.query;
    
    // Convert page and limit to numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    // Count total pending requests
    const total = await RegistrationRequest.countDocuments({ status: 'pending' });
    
    // Calculate total pages
    const totalPages = Math.ceil(total / limitNum);
    
    // Get pending registration requests with pagination
    const requests = await RegistrationRequest.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    res.render('admin/registrationRequests', {
      title: 'Registrierungsanfragen',
      requests,
      moment,
      success: req.query.success || null,
      error: req.query.error || null,
      currentPage: pageNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      total
    });
  } catch (error) {
    console.error('Get registration requests error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'An error occurred while loading the registration requests'
    });
  }
};

// @desc    Approve registration request
// @route   POST /admin/registration-requests/:id/approve
// @access  Private (Admin only)
exports.approveRegistrationRequest = async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the full request document with password
      const request = await RegistrationRequest.findById(id).select('+password');
      
      if (!request) {
        return res.redirect('/admin/registration-requests?error=Anfrage nicht gefunden');
      }
      
      if (request.status !== 'pending') {
        return res.redirect('/admin/registration-requests?error=Anfrage wurde bereits bearbeitet');
      }
      
      // Check for existing users
      const existingUsername = await User.findOne({ username: request.username });
      if (existingUsername) {
        return res.redirect('/admin/registration-requests?error=Benutzername existiert bereits');
      }
      
      const existingEmail = await User.findOne({ email: request.email });
      if (existingEmail) {
        return res.redirect('/admin/registration-requests?error=Email existiert bereits');
      }
      
 // Create user with direct DB operation to bypass Mongoose hooks
 const newUser = {
    username: request.username,
    email: request.email,
    password: request.password, // Already hashed
    eloRating: 500,
    isAdmin: false,
    createdAt: new Date(),
    lastActivity: new Date()
  };
  
  // Insert directly into MongoDB collection
  const result = await User.collection.insertOne(newUser);
  
  // Update request status
  request.status = 'approved';
  await request.save();
  
  // Success message
  console.log(`User ${request.username} successfully approved and created`);
  
  // Send approval email to user
  await sendRegistrationApprovedEmail({
    _id: result.insertedId,
    username: request.username,
    email: request.email
  });
  
  res.redirect('/admin/registration-requests?success=Registrierungsanfrage genehmigt');
    } catch (error) {
      console.error('Approve registration request error:', error);
      res.redirect('/admin/registration-requests?error=Server error');
    }
  };

// @desc    Reject registration request
// @route   POST /admin/registration-requests/:id/reject
// @access  Private (Admin only)
exports.rejectRegistrationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find request
    const request = await RegistrationRequest.findById(id);
    
    if (!request) {
      return res.redirect('/admin/registration-requests?error=Anfrage nicht gefunden');
    }
    
    if (request.status !== 'pending') {
      return res.redirect('/admin/registration-requests?error=Anfrage wurde bereits bearbeitet');
    }
    
    // Update request status
    request.status = 'rejected';
    await request.save();
    
    res.redirect('/admin/registration-requests?success=Registrierungsanfrage abgelehnt');
  } catch (error) {
    console.error('Reject registration request error:', error);
    res.redirect('/admin/registration-requests?error=Server error');
  }
};

// @desc    Get all game reports
// @route   GET /admin/game-reports
// @access  Admin only
exports.getGameReports = async (req, res) => {
  try {
    // Get all game reports, sort by newest first
    const reports = await GameReport.find()
      .sort({ createdAt: -1 })
      .populate({
        path: 'game',
        populate: {
          path: 'team1.player team2.player createdBy',
          select: 'username'
        }
      })
      .populate('reportedBy', 'username email');
    
    res.render('admin/gameReports', {
      title: 'Gemeldete Spiele',
      reports,
      pendingRequestsCount: await RegistrationRequest.countDocuments({ status: 'pending' }),
      moment
    });
  } catch (error) {
    console.error('Get game reports error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'An error occurred while loading the game reports'
    });
  }
};

// @desc    Delete a game report
// @route   POST /admin/game-reports/:id/delete
// @access  Admin only
exports.deleteGameReport = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find and delete the report
    await GameReport.findByIdAndDelete(id);
    
    // Redirect back to game reports page with success message
    res.redirect('/admin/game-reports?success=Meldung erfolgreich gelöscht');
  } catch (error) {
    console.error('Delete game report error:', error);
    res.redirect('/admin/game-reports?error=Fehler beim Löschen der Meldung');
  }
};

// @desc    Reset all ELO ratings and delete all games
// @route   POST /admin/reset-system
// @access  Private (Admin only)
exports.resetSystem = async (req, res) => {
  let session = null;
  
  try {
    // Aktuelles Datum für den Reset der Aktivität
    const currentDate = new Date();
    
    // Try to use a transaction if available
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      console.log('Using transaction for system reset');
      
      // 1. Reset all user ELO ratings to 500 and set lastActivity to current date
      const usersResult = await User.updateMany(
        { isAdmin: false }, // Only reset players, not admins
        { 
          $set: { 
            eloRating: 500,
            lastActivity: currentDate, // Setze lastActivity auf aktuelles Datum
            lastInactivityPenalty: null // Setze lastInactivityPenalty zurück
          } 
        },
        { session }
      );
      console.log(`Reset ELO ratings and activity for ${usersResult.modifiedCount} users`);
      
      // 2. Delete all games
      const gamesResult = await Game.deleteMany({}, { session });
      console.log(`Deleted ${gamesResult.deletedCount} games`);
      
      // 3. Delete all game reports
      const reportsResult = await GameReport.deleteMany({}, { session });
      console.log(`Deleted ${reportsResult.deletedCount} game reports`);
      
      // 4. Delete all quarterly ELO records
      const quarterlyResult = await QuarterlyELO.deleteMany({}, { session });
      console.log(`Deleted ${quarterlyResult.deletedCount} quarterly ELO records`);
      
      // Commit the transaction
      await session.commitTransaction();
      console.log('Transaction committed successfully');
    } catch (transactionError) {
      if (session) {
        await session.abortTransaction();
      }
      
      // If transaction failed, fallback to non-transactional approach
      console.log('Transaction not supported or failed, falling back to regular operations:', transactionError.message);
      
      // 1. Reset all user ELO ratings to 500 and lastActivity to current date
      const usersResult = await User.updateMany(
        { isAdmin: false },
        { 
          $set: { 
            eloRating: 500,
            lastActivity: currentDate, // Setze lastActivity auf aktuelles Datum
            lastInactivityPenalty: null // Setze lastInactivityPenalty zurück
          } 
        }
      );
      console.log(`Reset ELO ratings and activity for ${usersResult.modifiedCount} users`);
      
      // 2. Delete all games
      const gamesResult = await Game.deleteMany({});
      console.log(`Deleted ${gamesResult.deletedCount} games`);
      
      // 3. Delete all game reports
      const reportsResult = await GameReport.deleteMany({});
      console.log(`Deleted ${reportsResult.deletedCount} game reports`);
      
      // 4. Delete all quarterly ELO records
      const quarterlyResult = await QuarterlyELO.deleteMany({});
      console.log(`Deleted ${quarterlyResult.deletedCount} quarterly ELO records`);
    } finally {
      if (session) {
        session.endSession();
      }
    }
    
    // Log the successful reset
    console.log('System successfully reset by admin:', req.user.username);
    
    // Redirect with success message
    res.redirect('/admin/dashboard?success=System wurde erfolgreich zurückgesetzt. Alle Spieler haben nun 500 ELO-Punkte, alle Spiele wurden gelöscht und alle Spieler sind wieder aktiv.');
  } catch (error) {
    console.error('System reset error:', error);
    res.redirect('/admin/dashboard?error=Beim Zurücksetzen des Systems ist ein Fehler aufgetreten: ' + error.message);
  }
};

// @desc    Recalculate all ELO ratings for the current quarter
// @route   POST /admin/recalculate-elo
// @access  Private (Admin only)
exports.recalculateELO = async (req, res) => {
  try {
    // Get current quarter information
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const currentYear = now.getFullYear();
    
    // Use the same function that the cron job uses
    await recalculateQuarterlyELO({ year: currentYear, quarter: currentQuarter });
    
    res.redirect('/admin/dashboard?success=ELO-Werte für alle Spiele wurden erfolgreich neu berechnet');
  } catch (error) {
    console.error('ELO recalculation error:', error);
    res.redirect('/admin/dashboard?error=Bei der ELO-Neuberechnung ist ein Fehler aufgetreten: ' + error.message);
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
  const { calculateEloForMatch } = require('../utils/eloCalculator');
  return calculateEloForMatch(playersInfo.team1, playersInfo.team2, score);
}