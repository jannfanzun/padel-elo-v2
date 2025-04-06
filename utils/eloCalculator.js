/**
 * ELO Rating Calculator for Padel Ranking System
 * Based on the specifications from the provided document
 */

// Constants
const K_FACTOR = 32;
const SIGNIFICANT_WIN_THRESHOLD = 5; // Score difference for "high win"
const BONUS_POINTS_FOR_SIGNIFICANT_WIN = 3; // Extra points for high win
const INACTIVE_DAYS = 7; // Days of inactivity
const INACTIVE_PENALTY = 10; // Points deducted for inactivity

/**
 * Calculate win probability based on ELO ratings
 * Formula: 1 / (1 + 10^((opponentElo - playerElo) / 400))
 * @param {Number} playerElo - The ELO rating of the player or team
 * @param {Number} opponentElo - The ELO rating of the opponent or team
 * @returns {Number} - Win probability (0-1)
 */
const calculateWinProbability = (playerElo, opponentElo) => {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
};

/**
 * Calculate team ELO rating (average of both players)
 * @param {Number} player1Elo - ELO rating of player 1
 * @param {Number} player2Elo - ELO rating of player 2
 * @returns {Number} - Team ELO rating
 */
const calculateTeamElo = (player1Elo, player2Elo) => {
  return (player1Elo + player2Elo) / 2;
};

/**
 * Calculate new ELO rating after a match
 * @param {Number} currentElo - Current ELO rating
 * @param {Number} winProbability - Calculated win probability (0-1)
 * @param {Number} actualResult - Actual result (1 for win, 0 for loss)
 * @param {Number} scoreDifference - Absolute difference in scores
 * @returns {Number} - New ELO rating (rounded to integer)
 */
const calculateNewElo = (currentElo, winProbability, actualResult, scoreDifference) => {
  // Base ELO change
  let eloChange = K_FACTOR * (actualResult - winProbability);
  
  // Bonus for significant win / Penalty for significant loss
  if (scoreDifference >= SIGNIFICANT_WIN_THRESHOLD) {
    if (actualResult === 1) {
      // Winner gets bonus
      eloChange += BONUS_POINTS_FOR_SIGNIFICANT_WIN;
    } else {
      // Loser gets penalty
      eloChange -= BONUS_POINTS_FOR_SIGNIFICANT_WIN;
    }
  }
  
  // Round to nearest integer
  return Math.round(currentElo + eloChange);
};
/**
 * Calculate ELO changes for a match
 * @param {Object} team1 - Team 1 with player IDs and ELO ratings
 * @param {Object} team2 - Team 2 with player IDs and ELO ratings
 * @param {Object} score - Score object with team1 and team2 scores
 * @returns {Object} - Complete ELO calculation results
 */
const calculateEloForMatch = (team1, team2, score) => {
  // Calculate team ELO ratings
  const team1Elo = calculateTeamElo(team1.player1.eloRating, team1.player2.eloRating);
  const team2Elo = calculateTeamElo(team2.player1.eloRating, team2.player2.eloRating);
  
  // Determine the winner
  const team1Won = score.team1 > score.team2;
  const scoreDifference = Math.abs(score.team1 - score.team2);
  
  // Calculate win probabilities
  const team1WinProbability = calculateWinProbability(team1Elo, team2Elo);
  const team2WinProbability = calculateWinProbability(team2Elo, team1Elo);
  
  // Calculate new ELO ratings
  const team1Player1NewElo = calculateNewElo(
    team1.player1.eloRating,
    team1WinProbability,
    team1Won ? 1 : 0,
    scoreDifference
  );
  
  const team1Player2NewElo = calculateNewElo(
    team1.player2.eloRating,
    team1WinProbability,
    team1Won ? 1 : 0,
    scoreDifference
  );
  
  const team2Player1NewElo = calculateNewElo(
    team2.player1.eloRating,
    team2WinProbability,
    team1Won ? 0 : 1,
    scoreDifference
  );
  
  const team2Player2NewElo = calculateNewElo(
    team2.player2.eloRating,
    team2WinProbability,
    team1Won ? 0 : 1,
    scoreDifference
  );
  
  // Calculate ELO changes
  const team1Player1EloChange = team1Player1NewElo - team1.player1.eloRating;
  const team1Player2EloChange = team1Player2NewElo - team1.player2.eloRating;
  const team2Player1EloChange = team2Player1NewElo - team2.player1.eloRating;
  const team2Player2EloChange = team2Player2NewElo - team2.player2.eloRating;
  
  return {
    winner: team1Won ? 'team1' : 'team2',
    teamElo: {
      team1: team1Elo,
      team2: team2Elo
    },
    team1: [
      {
        player: team1.player1._id,
        eloBeforeGame: team1.player1.eloRating,
        eloAfterGame: team1Player1NewElo,
        eloChange: team1Player1EloChange
      },
      {
        player: team1.player2._id,
        eloBeforeGame: team1.player2.eloRating,
        eloAfterGame: team1Player2NewElo,
        eloChange: team1Player2EloChange
      }
    ],
    team2: [
      {
        player: team2.player1._id,
        eloBeforeGame: team2.player1.eloRating,
        eloAfterGame: team2Player1NewElo,
        eloChange: team2Player1EloChange
      },
      {
        player: team2.player2._id,
        eloBeforeGame: team2.player2.eloRating,
        eloAfterGame: team2Player2NewElo,
        eloChange: team2Player2EloChange
      }
    ]
  };
};

/**
 * Calculate inactivity penalty
 * @param {Object} user - User object with lastActivity date
 * @returns {Number} - Penalty amount (0 if not inactive)
 */
const calculateInactivityPenalty = (user) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - INACTIVE_DAYS);
  
  if (user.lastActivity < sevenDaysAgo) {
    return INACTIVE_PENALTY;
  }
  
  return 0;
};

module.exports = {
  calculateEloForMatch,
  calculateInactivityPenalty,
  calculateTeamElo,
  calculateWinProbability
};