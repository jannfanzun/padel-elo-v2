// controllers/tournamentController.js
const User = require('../models/User');
const Game = require('../models/Game');
const { body, validationResult } = require('express-validator');

// @desc    Show tournament generator page
// @route   GET /tournament/generator
// @access  Private
exports.getTournamentGenerator = async (req, res) => {
  try {
    // Sicherheitscheck: Nur eingeloggte Benutzer
    if (!req.user) {
      return res.redirect('/auth/login');
    }

    // Get all active users (excluding admin) sorted by ELO rating
    const users = await User.find({ 
      isAdmin: false,
      _id: { $exists: true } // Zusätzliche Sicherheit
    })
      .sort({ eloRating: -1 }) // Höchste ELO zuerst
      .select('username eloRating')
      .lean(); // Performance-Optimierung
    
    // Sicherheitsvalidierung der Benutzerdaten
    const sanitizedUsers = users.filter(user => 
      user.username && 
      typeof user.eloRating === 'number' &&
      user.username.length <= 30
    );
    
    res.render('user/tournamentGenerator', {
      title: 'Spieltag Generator',
      users: sanitizedUsers,
      error: req.query.error || null,
      success: req.query.success || null,
      user: req.user // Für Header-Partial
    });
  } catch (error) {
    console.error('Get tournament generator error:', error);
    res.status(500).render('error', { 
      title: 'Server Error',
      message: 'Ein Fehler ist beim Laden der Seite aufgetreten',
      user: req.user
    });
  }
};

// Validierungsregeln für Tournament Generation
exports.validateTournamentGeneration = [
  body('players')
    .isArray({ min: 4, max: 32 })
    .withMessage('Spieleranzahl muss zwischen 4 und 32 liegen'),
  body('players.*.username')
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Benutzername ungültig'),
  body('players.*.elo')
    .isInt({ min: 0, max: 2000 })
    .withMessage('ELO-Rating ungültig'),
  body('playerCount')
    .isInt({ min: 4, max: 32 })
    .custom((value, { req }) => {
      if (value % 4 !== 0) {
        throw new Error('Spieleranzahl muss durch 4 teilbar sein');
      }
      if (req.body.players && req.body.players.length !== value) {
        throw new Error('Spieleranzahl stimmt nicht mit ausgewählten Spielern überein');
      }
      return true;
    })
];

// @desc    Generate tournament matchups (API endpoint)
// @route   POST /tournament/generate
// @access  Private
exports.postGenerateTournament = async (req, res) => {
  try {
    // Sicherheitscheck: Nur eingeloggte Benutzer
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Validierungsfehler prüfen
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const { players, playerCount } = req.body;
    
    // Zusätzliche Sicherheitsprüfungen
    if (!Array.isArray(players) || players.length !== parseInt(playerCount)) {
      return res.status(400).json({
        success: false,
        message: `Genau ${playerCount} Spieler erforderlich`
      });
    }

    // Rate Limiting Check (Optional - falls nicht über Middleware gehandhabt)
    const userKey = `tournament_gen_${req.user._id}`;
    // Hier könnte Redis oder Memory-Cache für Rate Limiting verwendet werden
    
    // Spieler-Usernames extrahieren und sanitizen
    const playerUsernames = players.map(p => {
      if (!p.username || typeof p.username !== 'string') {
        throw new Error('Ungültiger Spielername');
      }
      return p.username.trim();
    });

    // Verify that all players exist in database
    const dbUsers = await User.find({ 
      username: { $in: playerUsernames },
      isAdmin: false 
    }).select('username eloRating').lean();
    
    if (dbUsers.length !== players.length) {
      return res.status(400).json({
        success: false,
        message: 'Ein oder mehrere Spieler wurden nicht in der Datenbank gefunden'
      });
    }
    
    // Use current ELO from database (sicherer als Frontend-Daten)
    const playersWithCurrentElo = players.map(player => {
      const dbUser = dbUsers.find(u => u.username === player.username.trim());
      if (!dbUser) {
        throw new Error(`Spieler ${player.username} nicht gefunden`);
      }
      return {
        id: dbUser._id,
        username: dbUser.username,
        elo: dbUser.eloRating
      };
    });

    // Lade die Spielanzahl für jeden Spieler
    const gamesCountMap = {};
    for (const player of playersWithCurrentElo) {
      const count = await Game.countDocuments({
        $or: [
          { 'team1.player': player.id },
          { 'team2.player': player.id }
        ]
      });
      gamesCountMap[player.id.toString()] = count;
    }

    // Generate tournament structure (mit Spielanzahl für neue Spieler Sortierung)
    const courts = generateTournamentMatchups(playersWithCurrentElo, gamesCountMap);
    
    // Log tournament generation für Audit Trail
    console.log(`Tournament generated by ${req.user.username} for ${playerCount} players`);
    
    res.json({
      success: true,
      courts,
      message: 'Turnier erfolgreich generiert',
      timestamp: new Date().toISOString()
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
 * Spieler werden nach ELO gruppiert: Beste gegen Beste, Schwächere gegen Schwächere
 * Neue Spieler (0 Spiele) werden in die schlechteste Gruppe sortiert
 * @param {Array} players - Array of player objects with id, username and elo
 * @param {Object} gamesCountMap - Map von Spieler-ID zu Anzahl Spiele
 * @returns {Array} - Array of court assignments
 */
function generateTournamentMatchups(players, gamesCountMap = {}) {
  try {
    // Input validation
    if (!Array.isArray(players) || players.length < 4 || players.length % 4 !== 0) {
      throw new Error('Ungültige Spieleranzahl für Turniergenerierung');
    }

    // Sortiere Spieler: Normale nach ELO, neue Spieler (0 Spiele) ans Ende
    const sortedPlayers = [...players].sort((a, b) => {
      const aGames = gamesCountMap[a.id?.toString()] || 0;
      const bGames = gamesCountMap[b.id?.toString()] || 0;

      // Wenn beide neu sind (0 Spiele), sortiere nach ELO untereinander
      if (aGames === 0 && bGames === 0) {
        return b.elo - a.elo;
      }

      // Neue Spieler (0 Spiele) kommen ans Ende
      if (aGames === 0) return 1;
      if (bGames === 0) return -1;

      // Normale Sortierung nach ELO (höchste zuerst)
      return b.elo - a.elo;
    });

    const courts = [];
    const numCourts = sortedPlayers.length / 4;

    // Jeder Court bekommt die nächsten 4 stärksten Spieler
    for (let courtIndex = 0; courtIndex < numCourts; courtIndex++) {
      // Hole die 4 Spieler für diesen Court (nach Stärke gruppiert)
      const courtPlayers = sortedPlayers.slice(courtIndex * 4, (courtIndex + 1) * 4);

      // Verteile die 4 Spieler auf 2 Teams für maximale Balance
      // Team 1: 1. und 4. stärkster Spieler dieser Gruppe
      // Team 2: 2. und 3. stärkster Spieler dieser Gruppe
      const team1 = [courtPlayers[0], courtPlayers[3]];
      const team2 = [courtPlayers[1], courtPlayers[2]];

      // Berechne Team-ELOs
      const team1Elo = Math.round((team1[0].elo + team1[1].elo) / 2);
      const team2Elo = Math.round((team2[0].elo + team2[1].elo) / 2);

      courts.push({
        courtNumber: courtIndex + 1,
        team1: team1.map(player => ({
          username: sanitizeString(player.username),
          elo: player.elo,
          userId: player.id?.toString() || null,
          isNewPlayer: (gamesCountMap[player.id?.toString()] || 0) === 0
        })),
        team2: team2.map(player => ({
          username: sanitizeString(player.username),
          elo: player.elo,
          userId: player.id?.toString() || null,
          isNewPlayer: (gamesCountMap[player.id?.toString()] || 0) === 0
        })),
        team1Elo,
        team2Elo,
        eloDifference: Math.abs(team1Elo - team2Elo)
      });
    }

    return courts;

  } catch (error) {
    console.error('Error in generateTournamentMatchups:', error);
    throw new Error('Fehler bei der Turniergenerierung');
  }
}

// Einfacher Algorithmus - keine unnötige Komplexität

/**
 * Sanitize string input für Sicherheit
 * @param {string} str - Input string
 * @returns {string} - Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, 30).replace(/[<>\"']/g, '');
}

/**
 * Validiere Tournament-Parameter
 * @param {Array} players - Spieler-Array
 * @param {number} playerCount - Erwartete Spieleranzahl
 * @returns {boolean} - Validierungsergebnis
 */
function validateTournamentParams(players, playerCount) {
  return (
    Array.isArray(players) &&
    players.length === playerCount &&
    playerCount >= 4 &&
    playerCount <= 24 &&
    playerCount % 4 === 0 &&
    players.every(p => 
      p.username && 
      typeof p.username === 'string' &&
      typeof p.elo === 'number' &&
      p.elo >= 0 &&
      p.elo <= 2000
    )
  );
}

module.exports = {
  getTournamentGenerator: exports.getTournamentGenerator,
  postGenerateTournament: exports.postGenerateTournament,
  validateTournamentGeneration: exports.validateTournamentGeneration
};