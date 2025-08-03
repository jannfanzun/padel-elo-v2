// controllers/tournamentController.js
const User = require('../models/User');

// @desc    Show tournament generator page
// @route   GET /tournament/generator
// @access  Private
exports.getTournamentGenerator = async (req, res) => {
  try {
    // Get all active users (excluding admin) sorted by ELO rating
    const users = await User.find({ isAdmin: false })
      .sort({ eloRating: -1 }) // Höchste ELO zuerst
      .select('username eloRating');
    
    res.render('user/tournamentGenerator', {
      title: 'Spieltag Generator',
      users,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error('Get tournament generator error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'Ein Fehler ist beim Laden der Seite aufgetreten'
    });
  }
};

// @desc    Generate tournament matchups (API endpoint)
// @route   POST /tournament/generate
// @access  Private
exports.postGenerateTournament = async (req, res) => {
  try {
    const { players, playerCount } = req.body;
    
    // Validate input
    if (!players || !Array.isArray(players) || players.length !== parseInt(playerCount)) {
      return res.status(400).json({
        success: false,
        message: `Genau ${playerCount} Spieler erforderlich`
      });
    }
    
    // Validate player count (must be multiple of 4)
    if (parseInt(playerCount) % 4 !== 0) {
      return res.status(400).json({
        success: false,
        message: 'Spieleranzahl muss durch 4 teilbar sein'
      });
    }
    
    // Verify that all players exist in database
    const playerUsernames = players.map(p => p.username);
    const dbUsers = await User.find({ 
      username: { $in: playerUsernames },
      isAdmin: false 
    }).select('username eloRating');
    
    if (dbUsers.length !== players.length) {
      return res.status(400).json({
        success: false,
        message: 'Ein oder mehrere Spieler wurden nicht in der Datenbank gefunden'
      });
    }
    
    // Use current ELO from database (more accurate than frontend data)
    const playersWithCurrentElo = players.map(player => {
      const dbUser = dbUsers.find(u => u.username === player.username);
      return {
        username: player.username,
        elo: dbUser.eloRating
      };
    });
    
    // Generate tournament structure
    const courts = generateTournamentMatchups(playersWithCurrentElo);
    
    res.json({
      success: true,
      courts,
      message: 'Turnier erfolgreich generiert'
    });
    
  } catch (error) {
    console.error('Generate tournament error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler beim Generieren des Turniers'
    });
  }
};

/**
 * Generate balanced tournament matchups based on ELO ratings
 * @param {Array} players - Array of players with username and elo
 * @returns {Array} Array of court assignments with balanced teams
 */
function generateTournamentMatchups(players) {
  // Sort players by ELO (strongest to weakest)
  const sortedPlayers = players.sort((a, b) => b.elo - a.elo);
  
  const courts = [];
  const courtsCount = sortedPlayers.length / 4;
  
  for (let court = 0; court < courtsCount; court++) {
    const startIndex = court * 4;
    const courtPlayers = sortedPlayers.slice(startIndex, startIndex + 4);
    
    // ELO-based team balancing strategy:
    // Take strongest and weakest players for team 1
    // Take 2nd and 3rd strongest for team 2
    // This creates the most balanced matchup
    const team1 = [courtPlayers[0], courtPlayers[3]]; // 1st strongest + 4th strongest
    const team2 = [courtPlayers[1], courtPlayers[2]]; // 2nd strongest + 3rd strongest
    
    // Calculate team averages for verification
    const team1Average = Math.round((team1[0].elo + team1[1].elo) / 2);
    const team2Average = Math.round((team2[0].elo + team2[1].elo) / 2);
    
    courts.push({
      number: court + 1,
      team1: {
        players: team1,
        averageElo: team1Average
      },
      team2: {
        players: team2,
        averageElo: team2Average
      },
      eloDifference: Math.abs(team1Average - team2Average)
    });
  }
  
  return courts;
}