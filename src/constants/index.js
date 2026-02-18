// Storage configuration
export const STORAGE_KEY = 'monames-state-v1';

// Game configuration
export const BOARD_SIZE = 25;
export const CLAUDE_GUESS_SELECT_DELAY = 600;
export const CLAUDE_GUESS_REVEAL_DELAY = 800;

// Team configuration
export const TEAM_CONFIG = ['red', 'blue'];

export const TEAM_COLORS = {
  red: 'var(--team-red)',
  blue: 'var(--team-blue)',
  neutral: 'var(--team-neutral)',
  assassin: 'var(--team-assassin)'
};

// Role configuration
export const ROLE_LABELS = {
  spymaster: 'Spymaster',
  guesser: 'Guesser'
};

export const ROLE_DEFAULTS = {
  spymaster: 'human',
  guesser: 'human'
};

// API configuration
export const DEFAULT_API_CONFIG = {
  provider: 'anthropic',
  baseUrl: '',
  apiKey: '',
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: '1000',
  temperature: '0.2',
  topP: '',
  topK: '',
  reasoningEffort: '',
  paramsJson: ''
};

// Legacy style labels (for migration)
export const LEGACY_STYLE_LABELS = {
  plain: 'Plain',
  creative: 'Creative',
  risky: 'Risky'
};
