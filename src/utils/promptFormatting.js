/**
 * Formats the board state for Claude prompts
 * @param {Array} cards - Array of card objects
 * @param {string} role - Role (spymaster or guesser)
 * @returns {string} Formatted board string
 */
export const formatBoardForPrompt = (cards, role) =>
  cards
    .map((card) => {
      const status =
        role === 'spymaster' || card.revealed ? card.team : 'unrevealed';
      return `${card.word}: ${String(status).toUpperCase()}`;
    })
    .join('\n');

/**
 * Formats guess history for Claude prompts
 * @param {Array} history - Game history array
 * @returns {string} Formatted history string
 */
export const formatGuessHistoryForPrompt = (history = []) => {
  if (!Array.isArray(history) || history.length === 0) {
    return 'No previous clues or guesses.';
  }
  return history
    .map((entry) => {
      const teamLabel = entry.team ? entry.team.toUpperCase() : 'UNKNOWN';
      if (entry.type === 'clue') {
        return `${teamLabel} clue: ${entry.clue} ${entry.count}`;
      }
      if (entry.type === 'guess') {
        const result = entry.cardTeam ? entry.cardTeam.toUpperCase() : 'UNKNOWN';
        return `${teamLabel} guess: ${entry.word} -> ${result}`;
      }
      if (entry.type === 'endTurn') {
        return `${teamLabel} ended their turn.`;
      }
      return `${teamLabel} ${entry.type}`;
    })
    .join('\n');
};

/**
 * Formats the current clue for Claude prompts
 * @param {Object} lastClue - Last clue object
 * @returns {string} Formatted clue string
 */
export const formatCurrentClueForPrompt = (lastClue) => {
  if (!lastClue?.clue || !lastClue?.count) {
    return 'CLUE: None';
  }
  return `CLUE: ${lastClue.clue} ${lastClue.count}`;
};

/**
 * Applies template replacements to a prompt template
 * @param {string} template - Prompt template with placeholders
 * @param {Object} context - Context object with replacement values
 * @returns {string} Formatted prompt
 */
export const applyPromptTemplate = (
  template,
  { team, role, cards, history, lastClue, remainingGuesses }
) => {
  if (!template) return '';

  const replacements = {
    '{{team}}': team ?? '',
    '{{teamUpper}}': team ? team.toUpperCase() : '',
    '{{role}}': role ?? '',
    '{{board}}': Array.isArray(cards) ? formatBoardForPrompt(cards, role) : '',
    '{{guess_history}}': formatGuessHistoryForPrompt(history),
    '{{current_clue}}': formatCurrentClueForPrompt(lastClue),
    '{{guess_limit}}':
      typeof remainingGuesses === 'number' ? String(remainingGuesses) : '0'
  };

  return Object.entries(replacements).reduce(
    (updated, [key, value]) => updated.split(key).join(value),
    template
  );
};
