const User = require('../models/User');
const Game = require('../models/Game');
const RegistrationRequest = require('../models/RegistrationRequest');
const moment = require('moment');
const { sendRegistrationApprovedEmail } = require('../config/email');

// @desc    Admin dashboard
// @route   GET /admin/dashboard
// @access  Private (Admin only)
exports.getDashboard = async (req, res) => {
  try {
    // Get counts
    const userCount = await User.countDocuments({ isAdmin: false });
    const gameCount = await Game.countDocuments();
    const pendingRequestsCount = await RegistrationRequest.countDocuments({ status: 'pending' });
    
    // Get Letzte Spiele
    const recentGames = await Game.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('team1.player team2.player createdBy', 'username');
    
    // Get recently registered users
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
    const { search } = req.query;
    
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
    
    // Get users
    const users = await User.find(query)
      .sort({ username: 1 });
    
    res.render('admin/users', {
      title: 'Manage Users',
      users,
      search,
      moment,
      success: req.query.success || null,
      error: req.query.error || null
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
      return res.redirect('/admin/users?error=User not found');
    }
    
    if (user.isAdmin) {
      return res.redirect('/admin/users?error=Cannot delete admin user');
    }
    
    // Check if user has games
    const gamesCount = await Game.countDocuments({
      $or: [
        { 'team1.player': id },
        { 'team2.player': id }
      ]
    });
    
    if (gamesCount > 0) {
      return res.redirect('/admin/users?error=Cannot delete user with games. Delete their games first.');
    }
    
    // Delete user
    await User.findByIdAndDelete(id);
    
    res.redirect('/admin/users?success=User deleted successfully');
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
      const { userId, search } = req.query;
      
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
              title: 'Manage Games',
              games: [],
              users: await User.find({ isAdmin: false }).sort({ username: 1 }).select('username'),
              selectedUserId: userId,
              search,
              moment,
              success: req.query.success || null,
              error: req.query.error || null
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
            title: 'Manage Games',
            games: [],
            users: await User.find({ isAdmin: false }).sort({ username: 1 }).select('username'),
            selectedUserId: userId,
            search,
            moment,
            success: req.query.success || null,
            error: req.query.error || null
          });
        }
      }
      
      // Get games
      const games = await Game.find(query)
        .sort({ createdAt: -1 })
        .populate('team1.player team2.player createdBy', 'username');
      
      // Get all users for filter
      const users = await User.find({ isAdmin: false })
        .sort({ username: 1 })
        .select('username');
      
      res.render('admin/games', {
        title: 'Manage Games',
        games,
        users,
        selectedUserId: userId,
        search,
        moment,
        success: req.query.success || null,
        error: req.query.error || null
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
    // Get pending registration requests
    const requests = await RegistrationRequest.find({ status: 'pending' })
      .sort({ createdAt: -1 });
    
    res.render('admin/registrationRequests', {
      title: 'Registration Requests',
      requests,
      moment,
      success: req.query.success || null,
      error: req.query.error || null
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