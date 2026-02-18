import { STORAGE_KEY, DEFAULT_API_CONFIG, ROLE_DEFAULTS, TEAM_CONFIG, LEGACY_STYLE_LABELS } from '../constants';
import { defaultPersonas } from '../data/personas';

/**
 * Fallback state used when no stored state exists
 */
export const fallbackState = {
  theme: 'light',
  apiConfig: DEFAULT_API_CONFIG,
  selectedPackId: 'monames',
  customPacks: [],
  personas: defaultPersonas,
  selectedPersonas: {
    spymaster: 'spymaster-plain',
    guesser: 'guesser-plain'
  },
  roleControl: {
    red: { spymaster: 'human', guesser: 'human' },
    blue: { spymaster: 'human', guesser: 'human' }
  },
  game: {
    cards: [],
    startingTeam: 'red',
    currentTurn: 'red',
    lastClue: null,
    remainingGuesses: null,
    history: [],
    endState: null
  },
  claudeResponseLog: []
};

/**
 * Parses stored state from localStorage
 * @returns {Object|null} Parsed state or null
 */
export const parseStoredState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.warn('Failed to parse stored state', error);
    return null;
  }
};

/**
 * Normalizes API config from stored state
 * @param {Object} storedState - Stored state object
 * @returns {Object} Normalized API config
 */
export const normalizeApiConfig = (storedState) => {
  const storedConfig = storedState?.apiConfig ?? {};
  const apiKey = storedConfig.apiKey ?? storedState?.apiKey ?? DEFAULT_API_CONFIG.apiKey;
  return {
    ...DEFAULT_API_CONFIG,
    ...storedConfig,
    apiKey
  };
};

/**
 * Builds personas from legacy prompt format
 * @param {Object} legacyPrompts - Legacy prompts object
 * @returns {Array} Array of persona objects
 */
export const buildPersonasFromLegacy = (legacyPrompts) => {
  if (!legacyPrompts) return defaultPersonas;
  return Object.entries(legacyPrompts).flatMap(([role, styles]) =>
    Object.entries(styles).map(([style, prompt]) => ({
      id: `${role}-${style}`,
      role,
      label: LEGACY_STYLE_LABELS[style] ?? style,
      prompt
    }))
  );
};

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
 * Coerces a value to a valid Claude persona selection
 * @param {string} role - Role name
 * @param {string} value - Current value
 * @param {Array} personas - Available personas
 * @param {Object} selectedPersonas - Selected personas mapping
 * @returns {string} Valid persona ID or 'human'
 */
export const coerceClaudeSelection = (role, value, personas, selectedPersonas) => {
  if (
    value &&
    isClaudeSelection(value) &&
    personas.some((persona) => persona.id === value && persona.role === role)
  ) {
    return value;
  }
  if (
    selectedPersonas?.[role] &&
    personas.some(
      (persona) => persona.id === selectedPersonas[role] && persona.role === role
    )
  ) {
    return selectedPersonas[role];
  }
  return personas.find((persona) => persona.role === role)?.id ?? 'human';
};

/**
 * Normalizes role control from stored state
 * @param {Object} storedRoleControl - Stored role control
 * @param {Array} personas - Available personas
 * @param {Object} selectedPersonas - Selected personas mapping
 * @returns {Object} Normalized role control
 */
export const normalizeRoleControl = (storedRoleControl, personas, selectedPersonas) => {
  const personaFallbacks = Object.keys(ROLE_DEFAULTS).reduce((acc, role) => {
    const preferred = selectedPersonas?.[role];
    if (preferred && personas.some((persona) => persona.id === preferred)) {
      acc[role] = preferred;
      return acc;
    }
    acc[role] = personas.find((persona) => persona.role === role)?.id ?? null;
    return acc;
  }, {});

  return TEAM_CONFIG.reduce((acc, team) => {
    acc[team] = Object.keys(ROLE_DEFAULTS).reduce((roles, role) => {
      const storedValue = storedRoleControl?.[team]?.[role];
      if (storedValue === 'human') {
        roles[role] = 'human';
        return roles;
      }
      if (storedValue === 'claude') {
        roles[role] = personaFallbacks[role] ?? 'human';
        return roles;
      }
      if (
        storedValue &&
        personas.some((persona) => persona.id === storedValue && persona.role === role)
      ) {
        roles[role] = storedValue;
        return roles;
      }
      roles[role] = storedValue ? personaFallbacks[role] ?? 'human' : 'human';
      return roles;
    }, {});
    return acc;
  }, {});
};

/**
 * Enforces role mode consistency (only one role type can be human)
 * @param {Object} roleControl - Role control object
 * @param {Array} personas - Available personas
 * @param {Object} selectedPersonas - Selected personas mapping
 * @returns {Object} Enforced role control
 */
export const enforceRoleMode = (roleControl, personas, selectedPersonas) => {
  const guessersAreHuman =
    isHumanSelection(roleControl.red?.guesser) &&
    isHumanSelection(roleControl.blue?.guesser);
  const spymastersAreHuman =
    isHumanSelection(roleControl.red?.spymaster) &&
    isHumanSelection(roleControl.blue?.spymaster);

  if (guessersAreHuman && !spymastersAreHuman) {
    return {
      red: {
        guesser: 'human',
        spymaster: coerceClaudeSelection(
          'spymaster',
          roleControl.red?.spymaster,
          personas,
          selectedPersonas
        )
      },
      blue: {
        guesser: 'human',
        spymaster: coerceClaudeSelection(
          'spymaster',
          roleControl.blue?.spymaster,
          personas,
          selectedPersonas
        )
      }
    };
  }

  if (spymastersAreHuman && !guessersAreHuman) {
    return {
      red: {
        spymaster: 'human',
        guesser: coerceClaudeSelection(
          'guesser',
          roleControl.red?.guesser,
          personas,
          selectedPersonas
        )
      },
      blue: {
        spymaster: 'human',
        guesser: coerceClaudeSelection(
          'guesser',
          roleControl.blue?.guesser,
          personas,
          selectedPersonas
        )
      }
    };
  }

  // Default: guessers are human, spymasters are Claude
  return {
    red: {
      guesser: 'human',
      spymaster: coerceClaudeSelection(
        'spymaster',
        roleControl.red?.spymaster,
        personas,
        selectedPersonas
      )
    },
    blue: {
      guesser: 'human',
      spymaster: coerceClaudeSelection(
        'spymaster',
        roleControl.blue?.spymaster,
        personas,
        selectedPersonas
      )
    }
  };
};
