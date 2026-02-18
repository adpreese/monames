import { BOARD_SIZE } from '../constants';
import { shuffle } from '../utils/wordProcessing';

/**
 * Builds a new game board from words
 * @param {string[]} words - Array of words
 * @param {string} startingTeam - Team that goes first (red or blue)
 * @returns {Array} Array of card objects
 */
export const buildBoard = (words, startingTeam) => {
  const shuffledWords = shuffle(words).slice(0, BOARD_SIZE);
  const teamDistribution = [
    ...Array(startingTeam === 'red' ? 9 : 8).fill('red'),
    ...Array(startingTeam === 'blue' ? 9 : 8).fill('blue'),
    ...Array(7).fill('neutral'),
    'assassin'
  ];
  const shuffledTeams = shuffle(teamDistribution);
  return shuffledWords.map((word, index) => ({
    id: `${word}-${index}`,
    word,
    team: shuffledTeams[index],
    revealed: false
  }));
};

/**
 * Formats board for Claude API (structured format)
 * @param {Array} cards - Card array
 * @param {string} role - Role (spymaster or guesser)
 * @returns {Array} Formatted board for API
 */
export const formatBoardForClaude = (cards, role) =>
  cards.map((card) => ({
    word: card.word,
    revealed: card.revealed,
    team: role === 'spymaster' || card.revealed ? card.team : null
  }));
