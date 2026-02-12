import { buildBoard } from './board';

/**
 * Creates a default game state with a new board
 * @param {string[]} packWords - Words to use for the board
 * @returns {Object} Default game state
 */
export const defaultGameState = (packWords) => {
  const startingTeam = Math.random() > 0.5 ? 'red' : 'blue';
  return {
    cards: buildBoard(packWords, startingTeam),
    startingTeam,
    currentTurn: startingTeam,
    lastClue: null,
    remainingGuesses: null,
    history: [],
    claudeNotesLog: [],
    endState: null
  };
};

/**
 * Appends an entry to the game history
 * @param {Object} state - Current game state
 * @param {Object} entry - History entry to append
 * @returns {Object} Updated game state
 */
export const appendHistory = (state, entry) => ({
  ...state,
  history: [...(state.history ?? []), entry]
});

/**
 * Creates a Claude notes entry for logging
 * @param {Object} payload - Claude's response payload
 * @param {string} team - Team color
 * @param {string} role - Role (spymaster/guesser)
 * @param {string} source - Source (claude/fake/human)
 * @returns {Object|null} Notes entry or null if no notes
 */
export const createClaudeNotesEntry = (payload, team, role, source) => {
  const notes = typeof payload?.notes === 'string' ? payload.notes.trim() : '';
  if (!notes) return null;
  return {
    id: `claude-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    team,
    role,
    source,
    notes,
    clue: payload?.clue ?? null,
    reveal: Array.isArray(payload?.reveal) ? payload.reveal : null,
    endTurn: typeof payload?.endTurn === 'boolean' ? payload.endTurn : null
  };
};

/**
 * Calculates the guess limit from a clue count (count + 1)
 * @param {number} count - Clue count
 * @returns {number|null} Guess limit or null
 */
export const getGuessLimit = (count) =>
  Number.isInteger(count) && count > 0 ? count + 1 : null;

/**
 * Evaluates if the game has ended
 * @param {Array} cards - Card array
 * @param {string} activeTeam - Currently active team (fallback if revealedBy not available)
 * @returns {Object|null} End state object or null if game continues
 */
export const evaluateEndState = (cards, activeTeam) => {
  const assassinCard = cards.find(
    (card) => card.team === 'assassin' && card.revealed
  );
  if (assassinCard) {
    // Use revealedBy property if available, otherwise fall back to activeTeam
    const loser = assassinCard.revealedBy || activeTeam;
    return {
      winner: loser === 'red' ? 'blue' : 'red',
      loser,
      reason: 'assassin'
    };
  }

  const redRemaining = cards.filter(
    (card) => card.team === 'red' && !card.revealed
  ).length;
  if (redRemaining === 0) {
    return { winner: 'red', loser: 'blue', reason: 'all-revealed' };
  }

  const blueRemaining = cards.filter(
    (card) => card.team === 'blue' && !card.revealed
  ).length;
  if (blueRemaining === 0) {
    return { winner: 'blue', loser: 'red', reason: 'all-revealed' };
  }

  return null;
};

/**
 * Applies a card reveal to the game state
 * @param {Object} state - Current game state
 * @param {string} cardId - ID of card to reveal
 * @param {string} activeTeam - Team making the guess
 * @returns {Object} Updated game state
 */
export const applyRevealToState = (state, cardId, activeTeam) => {
  const card = state.cards.find((item) => item.id === cardId);
  if (!card || card.revealed) return state;

  const nextCards = state.cards.map((item) =>
    item.id === cardId ? { ...item, revealed: true, revealedBy: activeTeam } : item
  );

  const endState = evaluateEndState(nextCards, activeTeam);

  const updatedRemaining =
    typeof state.remainingGuesses === 'number'
      ? Math.max(state.remainingGuesses - 1, 0)
      : state.remainingGuesses;

  const revealedWrongTeam = card.team !== activeTeam;
  const revealedAssassin = card.team === 'assassin';
  const guessesExhausted =
    typeof updatedRemaining === 'number' ? updatedRemaining === 0 : false;

  const shouldEndTurn = revealedWrongTeam || revealedAssassin || guessesExhausted;

  return {
    ...state,
    cards: nextCards,
    currentTurn: endState
      ? state.currentTurn
      : shouldEndTurn
      ? activeTeam === 'red'
        ? 'blue'
        : 'red'
      : state.currentTurn,
    remainingGuesses: endState ? null : shouldEndTurn ? null : updatedRemaining,
    endState
  };
};

/**
 * Creates a Claude response log entry
 * @param {Object} options - Entry options
 * @returns {Object} Log entry
 */
export const createClaudeResponseLogEntry = ({
  messageText,
  payload,
  team,
  role,
  source,
  error
}) => ({
  id: `claude-response-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  createdAt: new Date().toISOString(),
  team,
  role,
  source,
  messageText,
  payload: payload ?? null,
  error: error ? error.message ?? String(error) : null
});
