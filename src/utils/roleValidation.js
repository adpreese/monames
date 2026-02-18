import { TEAM_CONFIG, ROLE_DEFAULTS } from '../constants';
import { coerceClaudeSelection } from './statePersistence';

/**
 * Checks if a value is a human selection
 * @param {string} value - Selection value
 * @returns {boolean}
 */
export const isHumanSelection = (value) => value === 'human';

/**
 * Checks if a value is a Claude selection
 * @param {string} value - Selection value
 * @returns {boolean}
 */
export const isClaudeSelection = (value) => value && value !== 'human';

/**
 * Updates role control ensuring mode consistency
 * @param {Object} roleControl - Current role control
 * @param {string} team - Team being updated
 * @param {string} role - Role being updated
 * @param {string} value - New value
 * @param {Array} personas - Available personas
 * @param {Object} selectedPersonas - Selected personas mapping
 * @returns {Object} Updated role control
 */
export const updateRoleControlWithMode = (
  roleControl,
  team,
  role,
  value,
  personas,
  selectedPersonas
) => {
  const isHuman = isHumanSelection(value);
  const mode =
    role === 'guesser'
      ? isHuman
        ? 'guessers-human'
        : 'spymasters-human'
      : isHuman
      ? 'spymasters-human'
      : 'guessers-human';

  const next = { ...roleControl };
  TEAM_CONFIG.forEach((teamKey) => {
    next[teamKey] = { ...roleControl[teamKey] };
  });

  if (mode === 'guessers-human') {
    TEAM_CONFIG.forEach((teamKey) => {
      next[teamKey].guesser = 'human';
      const existing = teamKey === team ? value : next[teamKey].spymaster;
      next[teamKey].spymaster = coerceClaudeSelection(
        'spymaster',
        existing,
        personas,
        selectedPersonas
      );
    });
  } else {
    TEAM_CONFIG.forEach((teamKey) => {
      next[teamKey].spymaster = 'human';
      const existing = teamKey === team ? value : next[teamKey].guesser;
      next[teamKey].guesser = coerceClaudeSelection(
        'guesser',
        existing,
        personas,
        selectedPersonas
      );
    });
  }

  return next;
};
