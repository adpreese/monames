import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import { defaultPacks } from './data/wordPacks';
import { defaultPersonas } from './data/personas';
import Home from './screens/Home';
import Settings from './screens/Settings';
import NewGameSetup from './screens/NewGameSetup';
import Board from './components/Board';
import './styles.css';
import './theme-impressionist.css';

// Constants
import {
  STORAGE_KEY,
  BOARD_SIZE,
  CLAUDE_GUESS_SELECT_DELAY,
  CLAUDE_GUESS_REVEAL_DELAY,
  TEAM_CONFIG,
  TEAM_COLORS,
  ROLE_LABELS,
  ROLE_DEFAULTS,
  DEFAULT_API_CONFIG
} from './constants';

// Utilities
import { wait } from './utils/timing';
import { playSuccessSound, playFailureSound } from './utils/audio';
import {
  normalizeWords,
  parseWordList,
  dedupeWords,
  resolveSelectedPack,
  ensureCardIds,
  parseCsv
} from './utils/wordProcessing';
import { parseClaudePayload } from './utils/jsonParsing';

// State persistence
import {
  fallbackState,
  parseStoredState,
  normalizeApiConfig,
  buildPersonasFromLegacy,
  normalizeRoleControl,
  enforceRoleMode,
  isHumanSelection,
  isClaudeSelection,
  coerceClaudeSelection
} from './utils/statePersistence';

// Role validation
import { updateRoleControlWithMode } from './utils/roleValidation';

// Game logic
import {
  defaultGameState,
  appendHistory,
  createClaudeNotesEntry,
  getGuessLimit,
  evaluateEndState,
  applyRevealToState,
  createClaudeResponseLogEntry
} from './gameLogic/gameState';
import { buildBoard, formatBoardForClaude } from './gameLogic/board';

// API
import { callClaudeAPI } from './api/claude';

const App = () => {
  const storedState = useMemo(parseStoredState, []);
  const legacyPrompts = storedState?.prompts;
  const storedCustomPacks = storedState?.customPacks ?? [];
  const initialPackList = [...defaultPacks, ...storedCustomPacks];
  const initialPersonas = useMemo(
    () => storedState?.personas ?? buildPersonasFromLegacy(legacyPrompts),
    [legacyPrompts, storedState?.personas]
  );
  const initialSelectedPersonas = useMemo(() => {
    if (storedState?.selectedPersonas) {
      return storedState.selectedPersonas;
    }
    const defaults = {};
    const preferredStyles = storedState?.styles ?? { spymaster: 'plain', guesser: 'plain' };
    Object.keys(ROLE_DEFAULTS).forEach((role) => {
      const preferredStyle = preferredStyles?.[role];
      if (preferredStyle) {
        const preferredId = `${role}-${preferredStyle}`;
        if (initialPersonas.find((persona) => persona.id === preferredId)) {
          defaults[role] = preferredId;
          return;
        }
      }
      const firstPersona = initialPersonas.find((persona) => persona.role === role);
      defaults[role] = firstPersona?.id ?? '';
    });
    return defaults;
  }, [initialPersonas, storedState?.selectedPersonas, storedState?.styles]);

  const initialRoleControl = useMemo(
    () =>
      enforceRoleMode(
        normalizeRoleControl(
          storedState?.roleControl ?? fallbackState.roleControl,
          initialPersonas,
          initialSelectedPersonas
        ),
        initialPersonas,
        initialSelectedPersonas
      ),
    [initialPersonas, initialSelectedPersonas, storedState?.roleControl]
  );

  const initialSelectedPack = resolveSelectedPack(
    initialPackList,
    storedState?.selectedPackId ?? fallbackState.selectedPackId
  );

  const navigate = useNavigate();

  const [theme, setTheme] = useState(storedState?.theme ?? fallbackState.theme);
  const [apiConfig, setApiConfig] = useState(normalizeApiConfig(storedState));
  const [customPacks, setCustomPacks] = useState(storedCustomPacks);
  const [selectedPackId, setSelectedPackId] = useState(
    storedState?.selectedPackId ?? fallbackState.selectedPackId
  );
  const [personas, setPersonas] = useState(initialPersonas);
  const [selectedPersonas, setSelectedPersonas] = useState(initialSelectedPersonas);
  const [roleControl, setRoleControl] = useState(initialRoleControl);
  const [game, setGame] = useState(() => {
    const packWords = initialSelectedPack?.words ?? [];
    if (storedState?.game?.cards?.length) {
      const cardsWithIds = ensureCardIds(storedState.game.cards);
      const endState =
        storedState.game.endState ??
        evaluateEndState(cardsWithIds, storedState.game.currentTurn);
      return {
        ...storedState.game,
        cards: cardsWithIds,
        remainingGuesses:
          storedState.game.remainingGuesses ??
          (storedState.game.lastClue?.team === storedState.game.currentTurn
            ? getGuessLimit(storedState.game.lastClue?.count)
            : null),
        history: storedState.game.history ?? [],
        claudeNotesLog: storedState.game.claudeNotesLog ?? [],
        endState
      };
    }
    if (packWords.length < BOARD_SIZE) {
      return {
        cards: [],
        startingTeam: 'red',
        currentTurn: 'red',
        lastClue: null,
        remainingGuesses: null,
        history: [],
        claudeNotesLog: []
      };
    }
    return defaultGameState(packWords);
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [clueWord, setClueWord] = useState('');
  const [clueCount, setClueCount] = useState('');
  const [lastClaudeResult, setLastClaudeResult] = useState(
    storedState?.lastClaudeResult ?? null
  );
  const [claudeResponseLog, setClaudeResponseLog] = useState(
    storedState?.claudeResponseLog ?? []
  );
  const [pendingClaudeGuesser, setPendingClaudeGuesser] = useState(false);
  const [claudeNotesVisible, setClaudeNotesVisible] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [guessProgress, setGuessProgress] = useState(null);
  const [jsonParseError, setJsonParseError] = useState(null);
  const claudeGuessSequenceRef = useRef(0);
  const gameRef = useRef(game);

  const packs = useMemo(
    () => [...defaultPacks, ...customPacks],
    [customPacks]
  );

  const selectedPack = resolveSelectedPack(packs, selectedPackId);

  const personaOptions = useMemo(
    () =>
      personas.reduce(
        (acc, persona) => {
          acc[persona.role].push(persona);
          return acc;
        },
        { spymaster: [], guesser: [] }
      ),
    [personas]
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.add('theme-impressionist');
    return () => {
      root.classList.remove('theme-impressionist');
    };
  }, [theme]);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    const stateToStore = {
      theme,
      apiConfig,
      customPacks,
      selectedPackId,
      personas,
      selectedPersonas,
      roleControl,
      game,
      lastClaudeResult,
      claudeResponseLog
    };
    const timeoutId = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
    }, 400);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    apiConfig,
    claudeResponseLog,
    customPacks,
    game,
    lastClaudeResult,
    personas,
    roleControl,
    selectedPackId,
    selectedPersonas,
    theme
  ]);

  useEffect(() => {
    if (!selectedPack?.words || selectedPack.words.length < BOARD_SIZE) return;
    if (!game.cards.length) {
      setGame(defaultGameState(selectedPack.words));
    }
  }, [game.cards.length, selectedPack]);

  useEffect(() => {
    setSelectedPersonas((prev) => {
      const updated = { ...prev };
      Object.keys(ROLE_DEFAULTS).forEach((role) => {
        const hasSelection = personas.some(
          (persona) => persona.id === prev[role] && persona.role === role
        );
        if (!hasSelection) {
          const fallbackPersona = personas.find((persona) => persona.role === role);
          updated[role] = fallbackPersona?.id ?? '';
        }
      });
      return updated;
    });
  }, [personas]);

  useEffect(() => {
    setRoleControl((prev) =>
      enforceRoleMode(
        normalizeRoleControl(prev, personas, selectedPersonas),
        personas,
        selectedPersonas
      )
    );
  }, [personas, selectedPersonas]);

  useEffect(() => {
    setClaudeNotesVisible(false);
  }, [lastClaudeResult]);

  const cancelClaudeGuessSequence = useCallback(() => {
    claudeGuessSequenceRef.current += 1;
    setSelectedCardId(null);
    setGuessProgress(null);
  }, []);

  const runClaudeGuessSequence = useCallback(
    async ({ words, team, role, source, endTurn }) => {
      if (!Array.isArray(words) || !words.length) {
        if (endTurn) {
          setGame((prev) => {
            if (prev.endState || prev.currentTurn !== team) {
              return prev;
            }
            const updated = {
              ...prev,
              currentTurn: team === 'red' ? 'blue' : 'red',
              remainingGuesses: null
            };
            return appendHistory(updated, {
              type: 'endTurn',
              team,
              role,
              source
            });
          });
        }
        return;
      }
      const sequenceId = claudeGuessSequenceRef.current + 1;
      claudeGuessSequenceRef.current = sequenceId;
      const totalGuesses = words.length;
      await wait(0);
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (claudeGuessSequenceRef.current !== sequenceId) {
          return;
        }
        const currentState = gameRef.current;
        if (currentState.endState || currentState.currentTurn !== team) {
          break;
        }
        const remaining =
          typeof currentState.remainingGuesses === 'number'
            ? currentState.remainingGuesses
            : 0;
        if (remaining <= 0) {
          break;
        }
        const match = currentState.cards.find(
          (card) =>
            !card.revealed && card.word.toLowerCase() === String(word).toLowerCase()
        );
        if (!match) {
          continue;
        }
        const guessNumber = i + 1;
        setGuessProgress({ current: guessNumber, total: totalGuesses, word: match.word });
        setSelectedCardId(match.id);
        await wait(CLAUDE_GUESS_SELECT_DELAY);

        // Check if sequence was cancelled during delay
        if (claudeGuessSequenceRef.current !== sequenceId) {
          return;
        }

        // Store card info before revealing to determine if guess was correct
        const cardBeforeReveal = currentState.cards.find((item) => item.id === match.id);
        const isCorrectGuess = cardBeforeReveal && cardBeforeReveal.team === team;

        setGame((prev) => {
          if (prev.endState || prev.currentTurn !== team) {
            return prev;
          }
          if (
            typeof prev.remainingGuesses !== 'number' ||
            prev.remainingGuesses <= 0
          ) {
            return prev;
          }
          const card = prev.cards.find((item) => item.id === match.id);
          if (!card || card.revealed) {
            return prev;
          }
          const updated = applyRevealToState(prev, match.id, team);
          return appendHistory(updated, {
            type: 'guess',
            team,
            role,
            word: card.word,
            cardTeam: card.team,
            source
          });
        });

        // Check again before playing sound to avoid race condition
        if (claudeGuessSequenceRef.current !== sequenceId) {
          return;
        }

        // Play sound based on whether the guess was correct
        if (isCorrectGuess) {
          playSuccessSound();
        } else {
          playFailureSound();
        }

        await wait(CLAUDE_GUESS_REVEAL_DELAY);

        // Check again before clearing selection
        if (claudeGuessSequenceRef.current !== sequenceId) {
          return;
        }

        setSelectedCardId(null);
      }
      setGuessProgress(null);
      if (claudeGuessSequenceRef.current === sequenceId) {
        setGame((prev) => {
          if (prev.endState || prev.currentTurn !== team) {
            return prev;
          }
          const updated = {
            ...prev,
            currentTurn: team === 'red' ? 'blue' : 'red',
            remainingGuesses: null
          };
          return appendHistory(updated, {
            type: 'endTurn',
            team,
            role,
            source
          });
        });
      }
    },
    [setGame]
  );

  const updateCardReveal = useCallback(
    (id) => {
      if (
        typeof game.remainingGuesses !== 'number' ||
        game.remainingGuesses <= 0
      ) {
        setStatusMessage('No guesses remaining. End the turn or wait for a clue.');
        return;
      }
      setGame((prev) => {
        if (prev.endState) {
          return prev;
        }
        if (!isHumanSelection(roleControl[prev.currentTurn]?.guesser)) {
          return prev;
        }
        if (
          typeof prev.remainingGuesses !== 'number' ||
          prev.remainingGuesses <= 0
        ) {
          return prev;
        }
        const card = prev.cards.find((item) => item.id === id);
        if (!card || card.revealed) {
          return prev;
        }
        const updated = applyRevealToState(prev, id, prev.currentTurn);
        return appendHistory(updated, {
          type: 'guess',
          team: prev.currentTurn,
          role: 'guesser',
          word: card.word,
          cardTeam: card.team,
          source: 'human'
        });
      });
    },
    [game.remainingGuesses, roleControl]
  );

  const resetGame = () => {
    if (!selectedPack?.words || selectedPack.words.length < BOARD_SIZE) {
      setStatusMessage(
        `Select a word pack with at least ${BOARD_SIZE} words to start a game.`
      );
      return;
    }
    cancelClaudeGuessSequence();
    const startingTeam = Math.random() > 0.5 ? 'red' : 'blue';
    setGame({
      cards: buildBoard(selectedPack.words, startingTeam),
      startingTeam,
      currentTurn: startingTeam,
      lastClue: null,
      remainingGuesses: null,
      history: [],
      claudeNotesLog: [],
      endState: null
    });
    setLastClaudeResult(null);
  };

  const saveCustomPack = (packData) => {
    const name = packData.name?.trim();
    const parsedWords = parseWordList(packData.words ?? '');
    const { unique: words, duplicates } = dedupeWords(parsedWords);
    if (!name) {
      setStatusMessage('Custom pack needs a name.');
      return;
    }
    if (words.length < BOARD_SIZE) {
      setStatusMessage('Custom pack needs at least 25 words.');
      return;
    }
    if (packData.id) {
      setCustomPacks((prev) =>
        prev.map((pack) =>
          pack.id === packData.id ? { ...pack, name, words } : pack
        )
      );
      setStatusMessage(
        duplicates.length
          ? `Updated custom pack "${name}". Removed ${duplicates.length} duplicate word(s).`
          : `Updated custom pack "${name}".`
      );
      return;
    }
    const newPack = {
      id: `custom-${Date.now()}`,
      name,
      words
    };
    setCustomPacks((prev) => [...prev, newPack]);
    setSelectedPackId(newPack.id);
    setStatusMessage(
      duplicates.length
        ? `Added custom pack "${name}" with ${words.length} words after removing ${duplicates.length} duplicate(s).`
        : `Added custom pack "${name}" with ${words.length} words.`
    );
  };

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 1MB to prevent memory issues)
    const maxSizeBytes = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSizeBytes) {
      setStatusMessage(`File too large. Maximum size is ${maxSizeBytes / 1024 / 1024}MB.`);
      event.target.value = '';
      return;
    }

    const text = await file.text();
    const parsedWords = parseCsv(text);
    const { unique: words, duplicates } = dedupeWords(parsedWords);
    if (words.length < BOARD_SIZE) {
      setStatusMessage('Custom pack needs at least 25 words.');
      return;
    }
    const name = file.name.replace(/\.[^.]+$/, '');
    const newPack = {
      id: `custom-${Date.now()}`,
      name,
      words
    };
    setCustomPacks((prev) => [...prev, newPack]);
    setSelectedPackId(newPack.id);
    setStatusMessage(
      duplicates.length
        ? `Added custom pack "${name}" with ${words.length} words after removing ${duplicates.length} duplicate(s).`
        : `Added custom pack "${name}" with ${words.length} words.`
    );
    event.target.value = '';
  };

  const removeCustomPack = (packId) => {
    setCustomPacks((prev) => prev.filter((pack) => pack.id !== packId));
    if (selectedPackId === packId) {
      setSelectedPackId('monames');
    }
    setStatusMessage('Custom pack deleted.');
  };

  const savePersona = (personaData) => {
    const role = personaData.role;
    const label = personaData.label?.trim();
    const prompt = personaData.prompt?.trim();
    if (!ROLE_DEFAULTS[role]) {
      setStatusMessage('Persona role is required.');
      return;
    }
    if (!label) {
      setStatusMessage('Persona needs a label.');
      return;
    }
    if (!prompt) {
      setStatusMessage('Persona prompt cannot be empty.');
      return;
    }
    if (personaData.id) {
      const existingPersona = personas.find((persona) => persona.id === personaData.id);
      setPersonas((prev) =>
        prev.map((persona) =>
          persona.id === personaData.id
            ? { ...persona, role, label, prompt }
            : persona
        )
      );
      if (existingPersona && existingPersona.role !== role) {
        setSelectedPersonas((prev) => {
          const updated = { ...prev };
          if (prev[existingPersona.role] === personaData.id) {
            const nextPersona = personas.find(
              (persona) => persona.role === existingPersona.role && persona.id !== personaData.id
            );
            updated[existingPersona.role] = nextPersona?.id ?? '';
          }
          if (!prev[role]) {
            updated[role] = personaData.id;
          }
          return updated;
        });
      }
      setStatusMessage(`Updated persona "${label}".`);
      return;
    }
    const newPersona = {
      id: `persona-${Date.now()}`,
      role,
      label,
      prompt
    };
    setPersonas((prev) => [...prev, newPersona]);
    setSelectedPersonas((prev) => ({
      ...prev,
      [role]: prev[role] || newPersona.id
    }));
    setStatusMessage(`Added persona "${label}".`);
  };

  const deletePersona = (personaId) => {
    setPersonas((prev) => {
      const nextPersonas = prev.filter((persona) => persona.id !== personaId);
      setSelectedPersonas((selectedPrev) => {
        const updated = { ...selectedPrev };
        Object.keys(ROLE_DEFAULTS).forEach((role) => {
          if (selectedPrev[role] === personaId) {
            const nextPersona = nextPersonas.find(
              (persona) => persona.role === role
            );
            updated[role] = nextPersona?.id ?? '';
          }
        });
        return updated;
      });
      return nextPersonas;
    });
    setStatusMessage('Persona deleted.');
  };

  const selectPersona = (role, personaId) => {
    setSelectedPersonas((prev) => ({
      ...prev,
      [role]: personaId
    }));
  };

  const resolvePersonaForRole = (team, role) => {
    const selection = roleControl[team]?.[role];
    if (!isClaudeSelection(selection)) return null;
    return (
      personas.find((persona) => persona.id === selection && persona.role === role) ??
      personas.find((persona) => persona.id === selectedPersonas[role]) ??
      personas.find((persona) => persona.role === role) ??
      null
    );
  };

  const applyClaudeUpdate = (payload, team, role, source = 'claude') => {
    let statusOverride = null;
    const notesEntry = createClaudeNotesEntry(payload, team, role, source);
    const revealWords = Array.isArray(payload.reveal) ? payload.reveal : [];
    const shouldAnimateReveals = revealWords.length > 0;
    setGame((prev) => {
      if (prev.endState) {
        return prev;
      }
      let updates = { ...prev };
      if (payload.clue) {
        let sanitizedCount = null;
        let invalidCount = false;
        const numericCount = Number(payload.count);
        if (!Number.isInteger(numericCount) || numericCount < 1) {
          invalidCount = true;
          statusOverride = 'AI response invalid: count must be a positive integer.';
        } else {
          const remainingTeamWords = updates.cards.filter(
            (card) => card.team === team && !card.revealed
          ).length;
          if (numericCount > remainingTeamWords && remainingTeamWords > 0) {
            sanitizedCount = remainingTeamWords;
            statusOverride = `AI count exceeded remaining ${team} words; clamped to ${remainingTeamWords}.`;
          } else {
            sanitizedCount = numericCount;
          }
        }
        updates.lastClue = {
          clue: payload.clue,
          count: invalidCount ? null : sanitizedCount,
          team,
          role
        };
        updates.remainingGuesses = invalidCount ? null : getGuessLimit(sanitizedCount);
        updates = appendHistory(updates, {
          type: 'clue',
          team,
          role,
          clue: payload.clue,
          count: invalidCount ? null : sanitizedCount,
          source
        });
      }
      if (payload.endTurn && !shouldAnimateReveals) {
        if (!updates.endState && updates.currentTurn === team) {
          updates = {
            ...updates,
            currentTurn: team === 'red' ? 'blue' : 'red',
            remainingGuesses: null
          };
          updates = appendHistory(updates, {
            type: 'endTurn',
            team,
            role,
            source
          });
        }
      }
      if (updates.endState) {
        updates = { ...updates, remainingGuesses: null };
      }
      if (notesEntry) {
        updates = {
          ...updates,
          claudeNotesLog: [...(updates.claudeNotesLog ?? []), notesEntry]
        };
      }
      return updates;
    });
    if (shouldAnimateReveals) {
      runClaudeGuessSequence({
        words: revealWords,
        team,
        role,
        source,
        endTurn: Boolean(payload.endTurn)
      });
    }
    return statusOverride;
  };

  const handleFakeClaude = ({ team, role }) => {
    if (game.endState) {
      setStatusMessage('Game over. Start a new game to continue.');
      return;
    }
    const fakeResponseText =
      '{"clue":"WATER","count":2,"notes":"Buck and Duck are both water-related words - buck can refer to a male water fowl, and duck is a water bird"}';
    try {
      const parsed = parseClaudePayload(fakeResponseText);
      setClaudeResponseLog((prev) => [
        ...(prev ?? []),
        createClaudeResponseLogEntry({
          messageText: fakeResponseText,
          payload: parsed,
          team,
          role,
          source: 'fake'
        })
      ]);
      if (!parsed) {
        throw new Error('Fake AI response could not be parsed.');
      }
      const statusOverride = applyClaudeUpdate(parsed, team, role, 'fake');
      setLastClaudeResult({
        team,
        role,
        source: 'fake',
        payload: parsed
      });
      setStatusMessage(statusOverride ?? 'Fake AI response applied.');
    } catch (error) {
      console.error(error);
      setStatusMessage(`Fake AI response failed: ${error.message}`);
    }
  };

  const requestClaude = useCallback(async ({ team, role, apiConfigOverride = null }) => {
    const activePersona = resolvePersonaForRole(team, role);
    if (!activePersona?.prompt) {
      setStatusMessage(
        `Configuration error: No ${ROLE_LABELS[role]} persona prompt found. Go to Settings to add one.`
      );
      return;
    }

    if (game.endState) {
      setStatusMessage('Game over. Start a new game to continue.');
      return;
    }

    setIsBusy(true);
    setStatusMessage(`Contacting your AI for ${team} ${ROLE_LABELS[role]}...`);
    setJsonParseError(null);

    try {
      // Use apiConfigOverride if provided, otherwise use the current apiConfig
      const effectiveApiConfig = apiConfigOverride ?? apiConfig;
      const { data, messageText } = await callClaudeAPI({
        apiConfig: effectiveApiConfig,
        persona: activePersona,
        team,
        role,
        game
      });

      const parsed = parseClaudePayload(messageText);
      setClaudeResponseLog((prev) => [
        ...(prev ?? []),
        createClaudeResponseLogEntry({
          messageText,
          payload: parsed,
          team,
          role,
          source: 'claude'
        })
      ]);

      if (!parsed) {
        setJsonParseError({
          team,
          role,
          currentTemperature: Number.parseFloat(apiConfig.temperature) || 0.2,
          messageText
        });
        throw new Error('AI response did not include JSON.');
      }

      const statusOverride = applyClaudeUpdate(parsed, team, role);
      setLastClaudeResult({
        team,
        role,
        source: 'claude',
        payload: parsed
      });
      setStatusMessage(statusOverride ?? 'AI response applied.');
    } catch (error) {
      console.error(error);
      let errorMessage = error.message || 'Unknown error';

      // Provide helpful error messages based on error type
      if (errorMessage.includes('401') || errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
        setStatusMessage('API Error: Invalid API key. Go to Settings and check your API key.');
      } else if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
        setStatusMessage('API Error: Access forbidden. Check your API key permissions in Settings.');
      } else if (errorMessage.includes('404')) {
        setStatusMessage('API Error: Model not found. Go to Settings and verify your model name.');
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        setStatusMessage('API Error: Rate limit exceeded. Wait a moment and try again.');
      } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
        setStatusMessage('API Error: Server error. The API service may be temporarily unavailable. Try again later.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setStatusMessage('Network Error: Cannot reach the API. Check your internet connection.');
      } else if (errorMessage.includes('Custom provider requires a base URL')) {
        setStatusMessage('Configuration error: Custom provider requires a Base URL. Go to Settings and add one.');
      } else if (errorMessage.includes('JSON')) {
        setStatusMessage(`API Error: Could not parse response. ${errorMessage}`);
      } else {
        setStatusMessage(`Request failed: ${errorMessage}`);
      }
    } finally {
      setIsBusy(false);
    }
  }, [apiConfig, game, personas, roleControl, selectedPersonas, applyClaudeUpdate, resolvePersonaForRole]);

  useEffect(() => {
    if (!pendingClaudeGuesser || isBusy) return;
    if (!isClaudeSelection(roleControl[game.currentTurn]?.guesser)) {
      setPendingClaudeGuesser(false);
      return;
    }
    if (!game.lastClue || game.lastClue.role !== 'spymaster') {
      return;
    }
    setPendingClaudeGuesser(false);
    requestClaude({ team: game.currentTurn, role: 'guesser' });
  }, [game.currentTurn, game.lastClue, isBusy, pendingClaudeGuesser, roleControl, requestClaude]);

  const retryWithHigherTemperature = () => {
    if (!jsonParseError) return;

    const newTemperature = jsonParseError.currentTemperature * 1.2;

    // Request Claude again with the same team and role
    requestClaude({
      team: jsonParseError.team,
      role: jsonParseError.role,
      apiConfigOverride: {
        ...(apiConfig ?? DEFAULT_API_CONFIG),
        temperature: String(newTemperature)
      }
    });
  };

  const updateRoleControl = (team, role, value) => {
    setRoleControl((prev) =>
      updateRoleControlWithMode(prev, team, role, value, personas, selectedPersonas)
    );
  };

  const handleClueWordChange = (event) => {
    setClueWord(event.target.value);
  };

  const handleClueWordBlur = () => {
    const trimmedWord = clueWord.trim();
    if (!trimmedWord) {
      setStatusMessage('Enter a clue word.');
      return;
    }
    if (/\s/.test(trimmedWord)) {
      setStatusMessage('Clue must be a single word with no spaces.');
      return;
    }
    if (
      statusMessage === 'Enter a clue word.' ||
      statusMessage === 'Clue must be a single word with no spaces.'
    ) {
      setStatusMessage('');
    }
  };

  const submitClue = (event) => {
    event.preventDefault();
    const trimmedWord = clueWord.trim();
    if (!trimmedWord) {
      setStatusMessage('Enter a clue word.');
      return;
    }
    if (/\s/.test(trimmedWord)) {
      setStatusMessage('Clue must be a single word with no spaces.');
      return;
    }
    const parsedCount = Number.parseInt(clueCount, 10);
    if (Number.isNaN(parsedCount) || parsedCount < 1) {
      setStatusMessage('Clue count must be a positive number.');
      return;
    }
    const team = game.currentTurn;
    setGame((prev) => ({
      ...prev,
      lastClue: {
        clue: trimmedWord,
        count: parsedCount,
        team,
        role: 'spymaster'
      },
      remainingGuesses: getGuessLimit(parsedCount),
      history: [
        ...(prev.history ?? []),
        {
          type: 'clue',
          team,
          role: 'spymaster',
          clue: trimmedWord,
          count: parsedCount,
          source: 'human'
        }
      ]
    }));
    setStatusMessage('Clue submitted.');
    setClueWord('');
    setClueCount('');
    if (isClaudeSelection(roleControl[team]?.guesser)) {
      setPendingClaudeGuesser(true);
    }
  };

  const hasApiKey = Boolean(apiConfig.apiKey?.trim());

  const isGameOver = Boolean(game.endState);
  const isHumanGuesserTurn = isHumanSelection(roleControl[game.currentTurn]?.guesser);
  const isHumanSpymasterTurn = isHumanSelection(roleControl[game.currentTurn]?.spymaster);
  const hasRemainingGuesses =
    typeof game.remainingGuesses === 'number' && game.remainingGuesses > 0;
  const showTeamsOnBoard = isHumanSpymasterTurn && !isHumanGuesserTurn;

  const guessersAreHuman =
    isHumanSelection(roleControl.red?.guesser) &&
    isHumanSelection(roleControl.blue?.guesser);
  const spymastersAreHuman =
    isHumanSelection(roleControl.red?.spymaster) &&
    isHumanSelection(roleControl.blue?.spymaster);
  const guessersAreClaude =
    isClaudeSelection(roleControl.red?.guesser) &&
    isClaudeSelection(roleControl.blue?.guesser);
  const spymastersAreClaude =
    isClaudeSelection(roleControl.red?.spymaster) &&
    isClaudeSelection(roleControl.blue?.spymaster);
  const isSetupValid =
    (guessersAreHuman && spymastersAreClaude) ||
    (guessersAreClaude && spymastersAreHuman);
  const lastClaudePayload = lastClaudeResult?.payload ?? null;
  const claudeNotes =
    typeof lastClaudePayload?.notes === 'string' ? lastClaudePayload.notes.trim() : '';
  const claudeReveal = Array.isArray(lastClaudePayload?.reveal)
    ? lastClaudePayload.reveal
    : [];

  const handleStartGame = () => {
    if (!isSetupValid) return;
    if (!selectedPack?.words || selectedPack.words.length < BOARD_SIZE) {
      setStatusMessage(
        `Select a word pack with at least ${BOARD_SIZE} words to start a game.`
      );
      return;
    }
    resetGame();
    navigate('/game');
  };

  const roleSelectionLabel = (team, role) => {
    const selection = roleControl[team]?.[role];
    if (isHumanSelection(selection)) return 'Human';
    const persona =
      personas.find((item) => item.id === selection && item.role === role) ??
      personas.find((item) => item.id === selectedPersonas[role]);
    return persona ? `AI · ${persona.label}` : 'AI';
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1><img src={`${import.meta.env.BASE_URL}favicon.png`} alt="Monames icon" style={{ width: '32px', height: '32px', marginRight: '8px', verticalAlign: 'middle' }} />Monames</h1>
        </div>
        <nav className="app-nav">
          <NavLink className="nav-link" to="/">
            Home
          </NavLink>
          {hasApiKey ? (
            <NavLink className="nav-link" to="/setup">
              New Game
            </NavLink>
          ) : (
            <span className="nav-link nav-link--disabled" aria-disabled="true">
              New Game
            </span>
          )}
          <NavLink
            className={`nav-link${hasApiKey ? '' : ' nav-link--attention'}`}
            to="/settings"
          >
            Settings
          </NavLink>
          {game.cards.length > 0 && (
            <NavLink className="nav-link" to="/game">
              Game
            </NavLink>
          )}
        </nav>
      </header>

      <Routes>
        <Route
          path="/"
          element={<Home hasApiKey={hasApiKey} />}
        />
        <Route
          path="/settings"
          element={
            <main className="setup-screen">
              <Settings
                apiConfig={apiConfig}
                onApiConfigChange={setApiConfig}
                customPacks={customPacks}
                onSavePack={saveCustomPack}
                onDeletePack={removeCustomPack}
                onCsvUpload={handleCsvUpload}
                personas={personas}
                selectedPersonas={selectedPersonas}
                onSelectPersona={selectPersona}
                onSavePersona={savePersona}
                onDeletePersona={deletePersona}
                statusMessage={statusMessage}
              />
            </main>
          }
        />
        <Route
          path="/setup"
          element={
            !apiConfig.apiKey?.trim() ? (
              <Navigate to="/settings" replace />
            ) : (
              <NewGameSetup
                packs={packs}
                selectedPackId={selectedPackId}
                onSelectPack={setSelectedPackId}
                roleControl={roleControl}
                onRoleChange={updateRoleControl}
                personaOptions={personaOptions}
                isValidSetup={isSetupValid}
                onStartGame={handleStartGame}
                statusMessage={statusMessage}
              />
            )
          }
        />
        <Route
          path="/game"
          element={
            !apiConfig.apiKey?.trim() ? (
              <Navigate to="/settings" replace />
            ) : (
            <>
              <main className="layout">
                <section className="board-area">

                  <Board
                    cards={game.cards}
                    showTeams={showTeamsOnBoard}
                    onReveal={updateCardReveal}
                    disabled={!isHumanGuesserTurn || isGameOver || !hasRemainingGuesses}
                    selectedCardId={selectedCardId}
                  />
                  <div className="game-actions">
                    <div className="legend">
                      {Object.entries(TEAM_COLORS).map(([team, color]) => (
                        <span key={team} className="legend-item">
                          <span className="legend-dot" style={{ background: color }} />
                          {team}
                        </span>
                      ))}
                    </div>
                    <div className="game-actions__bar">
                      <div className="game-actions__meta">
                        <span className={`pill ${game.currentTurn}`}>
                          {game.currentTurn} team
                        </span>
                        <span className="game-actions__role">
                          {ROLE_LABELS.spymaster}
                        </span>
                        <span className="helper">
                          {roleSelectionLabel(game.currentTurn, 'spymaster')}
                        </span>
                        {guessProgress ? (
                          <span className="guess-progress">
                            Guessing {guessProgress.word} ({guessProgress.current} of {guessProgress.total})
                          </span>
                        ) : hasRemainingGuesses ? (
                          <span className="guesses-remaining">
                            {game.remainingGuesses} {game.remainingGuesses === 1 ? 'guess' : 'guesses'} remaining
                          </span>
                        ) : null}
                      </div>
                      {!isHumanSpymasterTurn &&
                        isClaudeSelection(roleControl[game.currentTurn]?.spymaster) && (
                          <div className="game-actions__buttons">
                            <button
                              type="button"
                              className="game-action-button game-action-button--claude"
                              onClick={() =>
                                requestClaude({ team: game.currentTurn, role: 'spymaster' })
                              }
                              disabled={isBusy || isGameOver}
                            >
                              Ask your AI for a clue
                            </button>
                            <button
                              type="button"
                              className="game-action-button game-action-button--sample"
                              onClick={() =>
                                handleFakeClaude({ team: game.currentTurn, role: 'spymaster' })
                              }
                              disabled={isBusy || isGameOver}
                              hidden
                            >
                              Try a sample clue
                            </button>
                            <button
                              type="button"
                              className="game-action-button game-action-button--end-turn"
                              disabled={!isHumanGuesserTurn || isGameOver}
                              onClick={() =>
                                setGame((prev) =>
                                  appendHistory(
                                    {
                                      ...prev,
                                      currentTurn: prev.currentTurn === 'red' ? 'blue' : 'red',
                                      remainingGuesses: null
                                    },
                                    {
                                      type: 'endTurn',
                                      team: prev.currentTurn,
                                      role: 'guesser',
                                      source: 'human'
                                    }
                                  )
                                )
                              }
                            >
                              End turn early
                            </button>
                          </div>
                        )}
                    </div>
                    {isHumanSpymasterTurn && (
                      <form className="clue-input" onSubmit={submitClue}>
                        <div>
                          <label htmlFor="clue-word">Clue word</label>
                          <input
                            id="clue-word"
                            type="text"
                            value={clueWord}
                            onChange={handleClueWordChange}
                            onBlur={handleClueWordBlur}
                            placeholder="One word"
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <label htmlFor="clue-count">Count</label>
                          <input
                            id="clue-count"
                            type="number"
                            min="1"
                            value={clueCount}
                            onChange={(event) => setClueCount(event.target.value)}
                            autoComplete="off"
                          />
                        </div>
                        <button type="submit" className="primary" disabled={isBusy}>
                          Submit clue
                        </button>
                      </form>
                    )}
                    <div className="claude-response">
                      {isBusy ? (
                        <div className="status">{statusMessage}</div>
                      ) : statusMessage && (statusMessage.includes('error') || statusMessage.includes('Error') || statusMessage.includes('failed')) ? (
                        <div className="status validation-warning">{statusMessage}</div>
                      ) : lastClaudeResult ? (
                        <>
                          <div className="claude-response__header">
                            <div className="claude-response__title">
                              <h3>Your AI's response</h3>
                              <span className={`pill ${lastClaudeResult.team}`}>
                                {lastClaudeResult.team} team
                              </span>
                              {lastClaudePayload?.clue && (
                                <>
                                  <span className="claude-response__clue">{lastClaudePayload.clue}</span>
                                  {typeof lastClaudePayload?.count === 'number' && (
                                    <span className="claude-response__count">{lastClaudePayload.count}</span>
                                  )}
                                </>
                              )}
                            </div>
                            <span className="pill">
                              {lastClaudeResult.source === 'fake' ? 'Sample' : 'Live'}
                            </span>
                          </div>
                          {(claudeReveal.length > 0 || typeof lastClaudePayload?.endTurn === 'boolean') && (
                            <dl className="claude-response__list">
                              {claudeReveal.length > 0 && (
                                <>
                                  <dt>Reveal</dt>
                                  <dd>{claudeReveal.join(', ')}</dd>
                                </>
                              )}
                              {typeof lastClaudePayload?.endTurn === 'boolean' && (
                                <>
                                  <dt>End turn</dt>
                                  <dd>{lastClaudePayload.endTurn ? 'Yes' : 'No'}</dd>
                                </>
                              )}
                            </dl>
                          )}
                          {claudeNotes && (
                            <div className="claude-response__notes">
                              <button
                                type="button"
                                className="secondary spoiler-button"
                                onClick={() =>
                                  setClaudeNotesVisible((prev) => !prev)
                                }
                              >
                                {claudeNotesVisible ? 'Hide notes' : 'Show notes'}
                              </button>
                              {claudeNotesVisible && (
                                <p>
                                  <strong>Notes:</strong> {claudeNotes}
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      ) : jsonParseError ? (
                        <div className="claude-response__error">
                          <div className="claude-response__header">
                            <div className="claude-response__title">
                              <h3>JSON Parsing Error</h3>
                              <span className={`pill ${jsonParseError.team}`}>
                                {jsonParseError.team} team
                              </span>
                            </div>
                          </div>
                          <p className="error-message">
                            Your AI's response could not be parsed as valid JSON. The response may be too creative or unstructured.
                          </p>
                          <details className="error-details">
                            <summary>Show raw response</summary>
                            <pre className="error-response-text">{jsonParseError.messageText}</pre>
                          </details>
                          <button
                            type="button"
                            className="primary retry-button"
                            onClick={retryWithHigherTemperature}
                            disabled={isBusy}
                          >
                            Retry with {Math.round(jsonParseError.currentTemperature * 1.2 * 100) / 100} temperature (+20%)
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
              </main>

              {isGameOver && (
                <div className="endgame-overlay" role="dialog" aria-modal="true">
                  <div className="endgame-modal">
                    <h2>Game over</h2>
                    <p>
                      {game.endState.reason === 'assassin'
                        ? `Assassin revealed — ${game.endState.loser} team loses.`
                        : `${game.endState.winner} team revealed all their words.`}
                    </p>
                    <div className="endgame-details">
                      <span className={`pill ${game.endState.winner}`}>
                        Winner: {game.endState.winner}
                      </span>
                      <span className={`pill ${game.endState.loser}`}>
                        Loser: {game.endState.loser}
                      </span>
                    </div>
                    <div className="endgame-notes">
                      <h3>Your AI's notes log</h3>
                      {game.claudeNotesLog?.length ? (
                        <ul>
                          {game.claudeNotesLog.map((entry) => (
                            <li key={entry.id}>
                              <div className="endgame-notes__meta">
                                <span className={`pill ${entry.team}`}>
                                  {entry.team} team
                                </span>
                                <span className="pill">
                                  {ROLE_LABELS[entry.role]}
                                </span>
                                <span className="pill">
                                  {entry.source === 'fake' ? 'Fake' : 'Live'}
                                </span>
                              </div>
                              <p className="endgame-notes__text">{entry.notes}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="helper">No AI notes logged.</p>
                      )}
                    </div>
                    <button type="button" className="primary" onClick={resetGame}>
                      Start new game
                    </button>
                  </div>
                </div>
              )}
            </>
            )
          }
        />
      </Routes>
    </div>
  );
};

export default App;
