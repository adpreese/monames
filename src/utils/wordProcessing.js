/**
 * Normalizes an array of words by trimming whitespace and removing empty entries
 * @param {string[]} words - Array of words to normalize
 * @returns {string[]} Normalized words
 */
export const normalizeWords = (words) =>
  words
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => word.replace(/\s+/g, ' '));

/**
 * Parses a text string (with newlines and/or commas) into an array of words
 * @param {string} text - Text to parse
 * @returns {string[]} Array of parsed words
 */
export const parseWordList = (text) =>
  normalizeWords(
    text
      .split(/\r?\n/)
      .flatMap((line) => line.split(','))
  );

/**
 * Removes duplicate words (case-insensitive) from an array
 * @param {string[]} words - Array of words
 * @returns {{unique: string[], duplicates: string[]}}
 */
export const dedupeWords = (words) => {
  const seen = new Set();
  const duplicates = new Set();
  const unique = [];
  words.forEach((word) => {
    const key = word.toLowerCase();
    if (seen.has(key)) {
      duplicates.add(word);
      return;
    }
    seen.add(key);
    unique.push(word);
  });
  return { unique, duplicates: Array.from(duplicates) };
};

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param {T[]} items - Array to shuffle
 * @returns {T[]} Shuffled copy of the array
 * @template T
 */
export const shuffle = (items) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

/**
 * Resolves the selected pack from a list by ID
 * @param {Array} packsList - List of available packs
 * @param {string} packId - ID of pack to select
 * @returns {Object|null} Selected pack or first pack or null
 */
export const resolveSelectedPack = (packsList, packId) =>
  packsList.find((pack) => pack.id === packId) ?? packsList[0] ?? null;

/**
 * Ensures all cards have IDs
 * @param {Array} cards - Array of card objects
 * @returns {Array} Cards with IDs ensured
 */
export const ensureCardIds = (cards) =>
  cards.map((card, index) => ({
    ...card,
    id: card.id ?? `${card.word}-${index}`
  }));

/**
 * Parses CSV text into words
 * @param {string} text - CSV text
 * @returns {string[]} Array of words
 */
export const parseCsv = (text) => parseWordList(text);
