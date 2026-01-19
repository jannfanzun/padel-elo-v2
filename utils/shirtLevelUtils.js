/**
 * Shirt Level Utility Functions
 * Determines player shirt level based on all-time games played
 */

const SHIRT_LEVELS = [
  { minGames: 1000, level: 'Legend', color: 'black' },
  { minGames: 750, level: 'Master', color: 'purple' },
  { minGames: 500, level: 'Expert', color: 'blue' },
  { minGames: 300, level: 'Advanced', color: 'green' },
  { minGames: 150, level: 'Experienced', color: 'orange' },
  { minGames: 90, level: 'Intermediate', color: 'yellow' },
  { minGames: 30, level: 'Beginner', color: 'white' },
  { minGames: 0, level: 'Rookie', color: '#bebebe' }
];

/**
 * Get shirt level info based on games played
 * @param {number} gamesPlayed - Total games played
 * @returns {Object} - Object with level and color
 */
const getShirtLevel = (gamesPlayed) => {
  for (const levelInfo of SHIRT_LEVELS) {
    if (gamesPlayed >= levelInfo.minGames) {
      return {
        level: levelInfo.level,
        color: levelInfo.color,
        minGames: levelInfo.minGames
      };
    }
  }
  return { level: 'Rookie', color: '#bebebe', minGames: 0 };
};

/**
 * Check if a player leveled up after a game
 * @param {number} gamesBeforeMatch - Games before this match
 * @param {number} gamesAfterMatch - Games after this match (gamesBeforeMatch + 1)
 * @returns {Object|null} - New level info if leveled up, null otherwise
 */
const checkShirtLevelUp = (gamesBeforeMatch, gamesAfterMatch) => {
  const levelBefore = getShirtLevel(gamesBeforeMatch);
  const levelAfter = getShirtLevel(gamesAfterMatch);

  if (levelBefore.level !== levelAfter.level) {
    return {
      oldLevel: levelBefore.level,
      oldColor: levelBefore.color,
      newLevel: levelAfter.level,
      newColor: levelAfter.color,
      gamesPlayed: gamesAfterMatch
    };
  }

  return null;
};

/**
 * Get the next shirt level and games required
 * @param {number} currentGames - Current games played
 * @returns {Object|null} - Next level info or null if at max level
 */
const getNextShirtLevel = (currentGames) => {
  const reversedLevels = [...SHIRT_LEVELS].reverse();

  for (const levelInfo of reversedLevels) {
    if (currentGames < levelInfo.minGames) {
      return {
        level: levelInfo.level,
        color: levelInfo.color,
        gamesRequired: levelInfo.minGames,
        gamesRemaining: levelInfo.minGames - currentGames
      };
    }
  }

  return null; // Already at Legend
};

module.exports = {
  SHIRT_LEVELS,
  getShirtLevel,
  checkShirtLevelUp,
  getNextShirtLevel
};
