/**
 * Award Utility Functions
 * Defines quarterly award types, icons, and helper functions
 */

const AWARD_TYPES = {
  best_improvement: {
    name: 'Beste Verbesserung',
    icon: 'fa-chart-line',
    color: '#28a745',
    emoji: '📈',
    description: 'Grösste ELO-Verbesserung im Quartal'
  },
  most_games: {
    name: 'Meiste Spiele',
    icon: 'fa-gamepad',
    color: '#17a2b8',
    emoji: '🎮',
    description: 'Meiste Spiele im Quartal gespielt'
  },
  best_elo: {
    name: 'Bester Spieler',
    icon: 'fa-crown',
    color: '#ffc107',
    emoji: '👑',
    description: 'Höchste ELO-Wertung am Quartalsende'
  }
};

/**
 * Get award info by type
 * @param {string} type - Award type
 * @returns {Object} - Award info object
 */
const getAwardInfo = (type) => {
  return AWARD_TYPES[type] || null;
};

/**
 * Get all award types
 * @returns {Object} - All award types
 */
const getAllAwardTypes = () => {
  return AWARD_TYPES;
};

/**
 * Format quarter string
 * @param {string} quarter - Quarter (Q1, Q2, Q3, Q4)
 * @param {number} year - Year
 * @returns {string} - Formatted string like "Q1 2024"
 */
const formatQuarterYear = (quarter, year) => {
  return `${quarter} ${year}`;
};

/**
 * Get current quarter
 * @returns {Object} - Current quarter and year
 */
const getCurrentQuarter = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  let quarter;
  if (month < 3) quarter = 'Q1';
  else if (month < 6) quarter = 'Q2';
  else if (month < 9) quarter = 'Q3';
  else quarter = 'Q4';

  return { quarter, year };
};

/**
 * Get available quarters for selection (current and past 4 quarters)
 * @returns {Array} - Array of quarter objects
 */
const getAvailableQuarters = () => {
  const quarters = [];
  const now = new Date();
  let year = now.getFullYear();
  let quarterNum = Math.floor(now.getMonth() / 3) + 1;

  for (let i = 0; i < 5; i++) {
    quarters.push({
      quarter: `Q${quarterNum}`,
      year: year,
      label: `Q${quarterNum} ${year}`
    });

    quarterNum--;
    if (quarterNum < 1) {
      quarterNum = 4;
      year--;
    }
  }

  return quarters;
};

module.exports = {
  AWARD_TYPES,
  getAwardInfo,
  getAllAwardTypes,
  formatQuarterYear,
  getCurrentQuarter,
  getAvailableQuarters
};
