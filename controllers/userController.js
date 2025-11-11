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
    
    // Get recent games
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
    const winRate = gamesPlayed > 0 ? 
      ((gamesWon / gamesPlayed) * 100).toFixed(1) : 0;
    
    // Check if inactive
    const isInactive = user.isInactive();
    
    // Bestimme Shirt-Farbe und Level basierend auf All Time Spielen
    let shirtColor = 'gray';
    let shirtLevel = 'Rookie';

    if (gamesPlayed >= 1000) {
      shirtColor = 'black';
      shirtLevel = 'Legend';
    } else if (gamesPlayed >= 750) {
      shirtColor = 'purple';
      shirtLevel = 'Master';
    } else if (gamesPlayed >= 500) {
      shirtColor = 'blue';
      shirtLevel = 'Expert';
    } else if (gamesPlayed >= 300) {
      shirtColor = 'green';
      shirtLevel = 'Advanced';
    } else if (gamesPlayed >= 150) {
      shirtColor = 'orange';
      shirtLevel = 'Experienced';
    } else if (gamesPlayed >= 90) {
      shirtColor = 'yellow';
      shirtLevel = 'Intermediate';
    } else if (gamesPlayed >= 30) {
      shirtColor = 'white';
      shirtLevel = 'Beginner';
    }
    
    // Berechne Spiele bis zum nächsten Level
    let nextLevelGames = 0;
    let nextLevelName = '';
    
    if (gamesPlayed < 30) {
      nextLevelGames = 30 - gamesPlayed;
      nextLevelName = 'Beginner';
    } else if (gamesPlayed < 90) {
      nextLevelGames = 90 - gamesPlayed;
      nextLevelName = 'Intermediate';
    } else if (gamesPlayed < 150) {
      nextLevelGames = 150 - gamesPlayed;
      nextLevelName = 'Experienced';
    } else if (gamesPlayed < 300) {
      nextLevelGames = 300 - gamesPlayed;
      nextLevelName = 'Advanced';
    } else if (gamesPlayed < 500) {
      nextLevelGames = 500 - gamesPlayed;
      nextLevelName = 'Expert';
    } else if (gamesPlayed < 750) {
      nextLevelGames = 750 - gamesPlayed;
      nextLevelName = 'Master';
    } else if (gamesPlayed < 1000) {
      nextLevelGames = 1000 - gamesPlayed;
      nextLevelName = 'Legend';
    }
    
    res.render('user/profile', {
      title: 'Mein Profil',
      user,
      rank,
      recentGames,
      stats: {
        gamesPlayed,
        gamesWon,
        winRate,
        isInactive,
        shirtColor,
        shirtLevel,
        nextLevelGames,
        nextLevelName
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
      .select('username eloRating lastActivity profileImage');
    
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
      const startELO = quarterlyELOMap.has(userId) ? 
        quarterlyELOMap.get(userId) : user.eloRating;
      
      userStats[userId] = {
        quarterlyGames: 0,
        quarterlyEloChange: user.eloRating - startELO,
        initialQuarterElo: startELO,
        currentElo: user.eloRating,
        alltimeGames: 0 // Neu für All Time Spiele
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
    
    // Für All Time Spiele: Zähle alle Spiele
    if (rankingType === 'alltime-games') {
      const allGames = await Game.find({}).populate('team1.player team2.player', 'username');
      
      allGames.forEach(game => {
        // Process Team 1 players
        game.team1.forEach(playerData => {
          const playerId = playerData.player._id.toString();
          if (userStats[playerId]) {
            userStats[playerId].alltimeGames++;
          }
        });
        
        // Process Team 2 players
        game.team2.forEach(playerData => {
          const playerId = playerData.player._id.toString();
          if (userStats[playerId]) {
            userStats[playerId].alltimeGames++;
          }
        });
      });
    }
    
    // Create rankings array with different sorting based on ranking type
    let rankings = [];
    
    users.forEach(user => {
      const userId = user._id.toString();
      const stats = userStats[userId] || { 
        quarterlyGames: 0, 
        quarterlyEloChange: 0,
        initialQuarterElo: user.eloRating,
        currentElo: user.eloRating,
        alltimeGames: 0
      };
      
      const isInactive = user.isInactive();
      
      // Bestimme Shirt-Farbe und Level für All Time Spiele
      let shirtColor = 'gray';
      let shirtLevel = 'Rookie';

      if (rankingType === 'alltime-games') {
        if (stats.alltimeGames >= 1000) {
          shirtColor = 'black';
          shirtLevel = 'Legend';
        } else if (stats.alltimeGames >= 750) {
          shirtColor = 'purple';
          shirtLevel = 'Master';
        } else if (stats.alltimeGames >= 500) {
          shirtColor = 'blue';
          shirtLevel = 'Expert';
        } else if (stats.alltimeGames >= 300) {
          shirtColor = 'green';
          shirtLevel = 'Advanced';
        } else if (stats.alltimeGames >= 150) {
          shirtColor = 'orange';
          shirtLevel = 'Experienced';
        } else if (stats.alltimeGames >= 90) {
          shirtColor = 'yellow';
          shirtLevel = 'Intermediate';
        } else if (stats.alltimeGames >= 30) {
          shirtColor = 'white';
          shirtLevel = 'Beginner';
        }
      }
      
      rankings.push({
        user,
        isInactive,
        quarterlyGames: stats.quarterlyGames,
        quarterlyEloChange: stats.quarterlyEloChange,
        initialQuarterElo: stats.initialQuarterElo,
        alltimeGames: stats.alltimeGames,
        shirtColor: shirtColor,
        shirtLevel: shirtLevel
      });
    });
    
    // Sort based on ranking type
    if (rankingType === 'quarterly-improvement') {
      rankings.sort((a, b) => b.quarterlyEloChange - a.quarterlyEloChange);
    } else if (rankingType === 'quarterly-games') {
      rankings.sort((a, b) => b.quarterlyGames - a.quarterlyGames);
    } else if (rankingType === 'alltime-games') {
      rankings.sort((a, b) => b.alltimeGames - a.alltimeGames);
    } else {
      // Default 'elo' sorting - already sorted by the database query
    }
    
    // Add rank property to each item
    rankings = rankings.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
    
    // Format quarter name for display
    const quarterStartMonths = ['Januar', 'April', 'Juli', 'Oktober'];
    const quarterEndMonths = ['März', 'Juni', 'September', 'Dezember'];
    const startMonth = quarterStartMonths[currentQuarter];
    const endMonth = quarterEndMonths[currentQuarter];
    const quarterName = `${startMonth} - ${endMonth} ${now.getFullYear()}`;
    
    res.render('user/rankings', {
      title: 'Spieler Rankings',
      rankings,
      rankingType,
      quarterName,
      user: req.user
    });
  } catch (error) {
    console.error('Get rankings error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'An error occurred while loading the rankings'
    });
  }
};

// @desc    Update user profile
// @route   POST /user/profile/update
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { username } = req.body;
    
    // Validierung
    if (!username || username.trim().length === 0) {
      return res.redirect('/user/profile?error=Benutzername ist erforderlich');
    }
    
    if (username.trim().length > 30) {
      return res.redirect('/user/profile?error=Benutzername darf nicht länger als 30 Zeichen sein');
    }
    
    // Prüfe, ob der Benutzername bereits von jemand anderem verwendet wird
    const existingUser = await User.findOne({ 
      username: username,
      _id: { $ne: userId } // Schließe den aktuellen Benutzer aus
    });
    
    if (existingUser) {
      return res.redirect('/user/profile?error=Benutzername wird bereits verwendet');
    }
    
    // Aktualisiere den Benutzernamen
    await User.findByIdAndUpdate(userId, { username: username.trim() });
    
    res.redirect('/user/profile?success=Dein Profil wurde erfolgreich aktualisiert');
  } catch (error) {
    console.error('Update profile error:', error);
    res.redirect('/user/profile?error=Bei der Aktualisierung deines Profils ist ein Fehler aufgetreten');
  }
};

exports.updateProfileImage = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Check if image was processed
    if (!req.processedImage) {
      return res.redirect('/user/profile?error=Kein gültiges Bild hochgeladen');
    }

    // Update user profile image path in database
    await User.findByIdAndUpdate(userId, { 
      profileImage: req.processedImage.path 
    });
    
    res.redirect('/user/profile?success=Profilbild erfolgreich aktualisiert');
  } catch (error) {
    console.error('Update profile image error:', error);
    res.redirect('/user/profile?error=Fehler beim Aktualisieren des Profilbildes');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { username } = req.body;
    
    // Validierung
    if (!username || username.trim().length === 0) {
      return res.redirect('/user/profile?error=Benutzername ist erforderlich');
    }
    
    if (username.trim().length > 30) {
      return res.redirect('/user/profile?error=Benutzername darf nicht länger als 30 Zeichen sein');
    }
    
    // Prüfe, ob der Benutzername bereits von jemand anderem verwendet wird
    const existingUser = await User.findOne({ 
      username: username,
      _id: { $ne: userId }
    });
    
    if (existingUser) {
      return res.redirect('/user/profile?error=Benutzername wird bereits verwendet');
    }
    
    // Update object for user
    const updateData = { username: username.trim() };
    
    // Add profile image if processed
    if (req.processedImage) {
      updateData.profileImage = req.processedImage.path;
    }
    
    // Aktualisiere den Benutzer
    await User.findByIdAndUpdate(userId, updateData);
    
    res.redirect('/user/profile?success=Profil erfolgreich aktualisiert');
  } catch (error) {
    console.error('Update profile error:', error);
    res.redirect('/user/profile?error=Bei der Aktualisierung deines Profils ist ein Fehler aufgetreten');
  }
};