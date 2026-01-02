const User = require('../models/User');
const Game = require('../models/Game');
const { calculateEloForMatch } = require('../utils/eloCalculator');
const { sendGameReportEmail, sendGameNotificationEmail, sendShirtLevelUpEmail } = require('../config/email');
const { getOrCreateQuarterlyELO } = require('../utils/quarterlyEloUtils');
const { checkShirtLevelUp } = require('../utils/shirtLevelUtils');

// @desc    Show add game page
// @route   GET /game/add
// @access  Private
exports.getAddGame = async (req, res) => {
  try {
    // Get all users (excluding admin) for player selection
    const users = await User.find({ isAdmin: false })
      .sort({ username: 1 })
      .select('username eloRating');
    
    res.render('user/addGame', {
      title: 'Spiel hinzufügen',
      users,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error('Get add game error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'An error occurred while loading the page'
    });
  }
};

// @desc    Process new game
// @route   POST /game/add
// @access  Private
exports.postAddGame = async (req, res) => {
  try {
    const { 
      teammate, opponent1, opponent2, 
      team1Score, team2Score 
    } = req.body;
    
    // Add this line to define currentUserId from the logged-in user
    const currentUserId = req.user._id;
    
    // Validate input
    if (!teammate || !opponent1 || !opponent2 || !team1Score || !team2Score) {
      return res.redirect('/game/add?error=Bitte alle Felder ausfüllen');
    }
    
    // Make sure all players are different
    if (
      currentUserId.toString() === teammate ||
      currentUserId.toString() === opponent1 ||
      currentUserId.toString() === opponent2 ||
      teammate === opponent1 ||
      teammate === opponent2 ||
      opponent1 === opponent2
    ) {
      return res.redirect('/game/add?error=Jeder Spieler kann nur einmal ausgewählt werden');
    }
    
    // Validate scores
    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);
    
    if (isNaN(score1) || isNaN(score2)) {
      return res.redirect('/game/add?error=Ungültige Punktzahl');
    }
    
    if (score1 === score2) {
      return res.redirect('/game/add?error=Die Punktzahlen dürfen nicht gleich sein');
    }
    
    if (
      score1 < 0 || score1 > 7 || 
      score2 < 0 || score2 > 7 || 
      (score1 === 0 && score2 === 0) ||
      (score1 === 7 && score2 === 7)
    ) {
      return res.redirect('/game/add?error=Ungültige Punktzahl. Die Punkte müssen zwischen 0 und 7 liegen und dürfen nicht 0-0 oder 7-7 sein');
    }
    
    // Get all players
    const player1 = await User.findById(currentUserId);
    const player2 = await User.findById(teammate);
    const player3 = await User.findById(opponent1);
    const player4 = await User.findById(opponent2);
    
    if (!player1 || !player2 || !player3 || !player4) {
      return res.redirect('/game/add?error=Ein oder mehrere Spieler wurden nicht gefunden');
    }
    
    // Ensure all players have quarterly ELO records
    await getOrCreateQuarterlyELO(player1._id);
    await getOrCreateQuarterlyELO(player2._id);
    await getOrCreateQuarterlyELO(player3._id);
    await getOrCreateQuarterlyELO(player4._id);

    // Count games for each player BEFORE this game (for shirt level tracking)
    const players = [player1, player2, player3, player4];
    const gamesBeforeMatch = await Promise.all(
      players.map(async (player) => {
        const count = await Game.countDocuments({
          $or: [
            { 'team1.player': player._id },
            { 'team2.player': player._id }
          ]
        });
        return { player, gamesCount: count };
      })
    );

    // Prepare teams
    const team1 = {
      player1: player1,
      player2: player2
    };
    
    const team2 = {
      player1: player3,
      player2: player4
    };
    
    // Prepare score
    const score = {
      team1: score1,
      team2: score2
    };
    
    // Calculate ELO changes
    const eloResults = calculateEloForMatch(team1, team2, score);
    
    // Create game record
    const game = await Game.create({
      team1: eloResults.team1,
      team2: eloResults.team2,
      score,
      teamElo: eloResults.teamElo,
      winner: eloResults.winner,
      createdBy: player1._id
    });
    
    // Update lastActivity for all players
    const currentDate = Date.now();
    
    // Update all players' ELO ratings and lastActivity
    await User.findByIdAndUpdate(player1._id, { 
      eloRating: eloResults.team1[0].eloAfterGame,
      lastActivity: currentDate
    });
    
    await User.findByIdAndUpdate(player2._id, { 
      eloRating: eloResults.team1[1].eloAfterGame,
      lastActivity: currentDate
    });
    
    await User.findByIdAndUpdate(player3._id, { 
      eloRating: eloResults.team2[0].eloAfterGame,
      lastActivity: currentDate
    });
    
    await User.findByIdAndUpdate(player4._id, { 
      eloRating: eloResults.team2[1].eloAfterGame,
      lastActivity: currentDate
    });
    
    // Fetch the fully populated game for the email notification
    const populatedGame = await Game.findById(game._id)
      .populate('team1.player team2.player createdBy', 'username email');
      
    // Send email notifications to all players
    await sendGameNotificationEmail(populatedGame);

    // Check for shirt level-ups and notify admin
    for (const playerData of gamesBeforeMatch) {
      const gamesAfterMatch = playerData.gamesCount + 1;
      const levelUp = checkShirtLevelUp(playerData.gamesCount, gamesAfterMatch);

      if (levelUp) {
        await sendShirtLevelUpEmail(playerData.player, levelUp);
      }
    }

    res.redirect(`/game/${game._id}?success=Spiel erfolgreich hinzugefügt und alle Spieler wurden benachrichtigt`);
  } catch (error) {
    console.error('Add game error:', error);
    res.redirect('/game/add?error=Server error');
  }
};

// @desc    Show game details
// @route   GET /game/:id
// @access  Private
exports.getGameDetails = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('team1.player team2.player createdBy', 'username');
    
    if (!game) {
      return res.status(404).render('error', { 
        title: 'Not Found',
        message: 'Spiel nicht gefunden'
      });
    }
    
    res.render('user/gameDetails', {
      title: 'Game Details',
      game,
      success: req.query.success || null
    });
  } catch (error) {
    console.error('Get game details error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'An error occurred while loading the game details'
    });
  }
};

// @desc    Get user games
// @route   GET /game/user/history
// @access  Private
exports.getUserGames = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get query parameters
    const { page = 1, limit = 10 } = req.query;
    
    // Parse to integers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    // Build query - find games where the user participated
    const query = {
      $or: [
        { 'team1.player': userId },
        { 'team2.player': userId }
      ]
    };
    
    // Count total games for pagination
    const total = await Game.countDocuments(query);
    
    // Calculate total pages
    const totalPages = Math.ceil(total / limitNum);
    
    // Find games with pagination
    const games = await Game.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('team1.player team2.player createdBy', 'username');
    
    res.render('user/games', {
      title: 'Meine Spiele',
      games,
      user: req.user,
      currentPage: pageNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      total
    });
  } catch (error) {
    console.error('Get user games error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'An error occurred while loading the games'
    });
  }
};

// @desc    Report a game issue
// @route   POST /game/:id/report
// @access  Private
exports.reportGame = async (req, res) => {
  try {
    const gameId = req.params.id;
    const { reason, details } = req.body;
    const user = req.user;
    
    // Validate reason
    if (!reason) {
      return res.redirect(`/game/${gameId}?error=Bitte gib einen Grund für die Meldung an`);
    }
    
    // Check if game exists
    const game = await Game.findById(gameId)
      .populate('team1.player team2.player createdBy', 'username');
    
    if (!game) {
      return res.status(404).render('error', { 
        title: 'Not Found',
        message: 'Spiel nicht gefunden'
      });
    }
    
    // Import GameReport model
    const GameReport = require('../models/GameReport');
    
    // Create game report in database
    await GameReport.create({
      game: gameId,
      reportedBy: user._id,
      reason,
      details
    });
    
    // Send email to admin
    await sendGameReportEmail(user, game, reason, details);
    
    // Redirect with success message
    res.redirect(`/game/${gameId}?success=Vielen Dank für deine Meldung. Der Administrator wird das Spiel überprüfen.`);
  } catch (error) {
    console.error('Game report error:', error);
    res.redirect(`/game/${req.params.id}?error=Bei der Meldung ist ein Fehler aufgetreten. Bitte versuche es später erneut.`);
  }
};