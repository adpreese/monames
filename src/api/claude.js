import { DEFAULT_API_CONFIG, ROLE_LABELS } from '../constants';
import { applyPromptTemplate } from '../utils/promptFormatting';
import { formatBoardForClaude } from '../gameLogic/board';

/**
 * Extracts message text from different provider response formats
 * @param {Object} data - API response data
 * @param {string} provider - Provider name (anthropic/openai/openrouter/custom)
 * @returns {string} Extracted message text
 */
export const getProviderMessageText = (data, provider) => {
  if (!data) return '';

  if (provider === 'anthropic') {
    if (typeof data?.text === 'string') return data.text;
    if (Array.isArray(data?.content)) {
      return data.content
        .filter((part) => part?.type === 'text' || typeof part?.text === 'string')
        .map((part) => part?.text ?? '')
        .join('\n');
    }
    return '';
  }

  const choice = Array.isArray(data?.choices) ? data.choices[0] : null;
  if (typeof choice?.message?.content === 'string') {
    return choice.message.content;
  }
  if (typeof choice?.text === 'string') {
    return choice.text;
  }
  return '';
};

/**
 * Parses and validates additional API parameters JSON
 * @param {string} paramsJson - JSON string of additional parameters
 * @returns {{value: Object|null, error: string|null}}
 */
export const parseApiParams = (paramsJson) => {
  if (!paramsJson?.trim()) {
    return { value: {}, error: null };
  }
  try {
    const parsed = JSON.parse(paramsJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: null, error: 'JSON params must be an object.' };
    }
    return { value: parsed, error: null };
  } catch (error) {
    return { value: null, error: error.message };
  }
};

/**
 * Calls the Claude (or compatible) API
 * @param {Object} options - API call options
 * @returns {Promise<{data: Object, messageText: string}>}
 */
export const callClaudeAPI = async ({
  apiConfig,
  persona,
  team,
  role,
  game
}) => {
  const resolvedApiConfig = apiConfig ?? DEFAULT_API_CONFIG;
  const apiKey = resolvedApiConfig.apiKey?.trim();

  if (!apiKey) {
    throw new Error('API key is missing. Go to Settings and add your API key to enable AI turns.');
  }

  const provider = resolvedApiConfig.provider ?? DEFAULT_API_CONFIG.provider;
  const modelName = resolvedApiConfig.model?.trim();

  if (!modelName) {
    throw new Error('Model name is required. Go to Settings and specify a model.');
  }

  const baseUrl = resolvedApiConfig.baseUrl?.trim();
  if (provider !== 'anthropic' && provider !== 'openai' && provider !== 'openrouter' && !baseUrl) {
    throw new Error('Custom provider requires a Base URL. Go to Settings and add one.');
  }

  const paramsResult = parseApiParams(resolvedApiConfig.paramsJson);
  if (paramsResult.error) {
    throw new Error(`Invalid JSON in additional params - ${paramsResult.error}. Go to Settings to fix it.`);
  }

  // Build prompt
  const basePrompt = applyPromptTemplate(persona.prompt ?? '', {
    team,
    role,
    cards: game.cards,
    history: game.history ?? [],
    lastClue: game.lastClue,
    remainingGuesses: game.remainingGuesses
  });

  const roleIntro = `You are the ${ROLE_LABELS[role]} for the ${team} team.`;

  // Parse numeric parameters
  const maxTokens = Number.parseInt(resolvedApiConfig.maxTokens, 10);
  const temperature = Number.parseFloat(resolvedApiConfig.temperature);
  const topP = Number.parseFloat(resolvedApiConfig.topP);
  const topK = Number.parseInt(resolvedApiConfig.topK, 10);

  const resolvedMaxTokens = Number.isFinite(maxTokens) ? maxTokens : 400;
  const resolvedTemperature = Number.isFinite(temperature) ? temperature : 0.2;
  const resolvedTopP = Number.isFinite(topP) ? topP : undefined;
  const resolvedTopK = Number.isFinite(topK) ? topK : undefined;

  // Schema for response
  const schema =
    role === 'spymaster'
      ? '{"clue":"word","count":2,"notes":""}'
      : '{"reveal":["word","word"],"endTurn":false,"notes":""}';

  const claudeContext = {
    board: formatBoardForClaude(game.cards, role),
    currentTurn: game.currentTurn,
    startingTeam: game.startingTeam,
    remainingGuesses: game.remainingGuesses,
    lastClue: game.lastClue,
    history: game.history ?? [],
    requestingTeam: team,
    requestingRole: role
  };

  const guesserInstructions =
    role === 'guesser'
      ? 'For reveal, include multiple guesses in order (up to remainingGuesses). Stop guessing after the limit, or set endTurn true to stop early.'
      : '';

  const schemaInstruction = `Respond with JSON only using this schema: ${schema}. ${guesserInstructions}`.trim();

  const messageOverrides = paramsResult.value ?? {};

  // Build request
  let requestUrl = baseUrl;
  let requestHeaders = {
    'Content-Type': 'application/json'
  };
  let requestBody = {};

  if (provider === 'anthropic') {
    requestUrl =
      requestUrl ||
      (import.meta.env.DEV
        ? '/api/anthropic/v1/messages'
        : 'https://api.anthropic.com/v1/messages');
    requestHeaders = {
      ...requestHeaders,
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };
    requestBody = {
      model: modelName,
      max_tokens: resolvedMaxTokens,
      temperature: resolvedTemperature,
      system: `${roleIntro}\n${basePrompt}\n\n${schemaInstruction}`,
      messages: [
        {
          role: 'user',
          content: `Game state JSON:\n${JSON.stringify(claudeContext)}`
        }
      ],
      ...(resolvedTopP !== undefined ? { top_p: resolvedTopP } : {}),
      ...(resolvedTopK !== undefined ? { top_k: resolvedTopK } : {}),
      ...messageOverrides
    };
  } else if (provider === 'openai') {
    requestUrl =
      requestUrl ||
      (import.meta.env.DEV
        ? '/api/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions');
    requestHeaders = {
      ...requestHeaders,
      Authorization: `Bearer ${apiKey}`
    };
    requestBody = {
      model: modelName,
      temperature: resolvedTemperature,
      messages: [
        {
          role: 'system',
          content: `${roleIntro}\n${basePrompt}\n\n${schemaInstruction}`
        },
        {
          role: 'user',
          content: `Game state JSON:\n${JSON.stringify(claudeContext)}`
        }
      ],
      ...(Number.isFinite(resolvedMaxTokens) ? { max_tokens: resolvedMaxTokens } : {}),
      ...(resolvedTopP !== undefined ? { top_p: resolvedTopP } : {}),
      ...(resolvedApiConfig.reasoningEffort
        ? { reasoning_effort: resolvedApiConfig.reasoningEffort }
        : {}),
      ...messageOverrides
    };
  } else if (provider === 'openrouter') {
    requestUrl =
      requestUrl ||
      (import.meta.env.DEV
        ? '/api/openrouter/api/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions');
    requestHeaders = {
      ...requestHeaders,
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Codenames AI'
    };
    requestBody = {
      model: modelName,
      temperature: resolvedTemperature,
      messages: [
        {
          role: 'system',
          content: `${roleIntro}\n${basePrompt}\n\n${schemaInstruction}`
        },
        {
          role: 'user',
          content: `Game state JSON:\n${JSON.stringify(claudeContext)}`
        }
      ],
      ...(Number.isFinite(resolvedMaxTokens) ? { max_tokens: resolvedMaxTokens } : {}),
      ...(resolvedTopP !== undefined ? { top_p: resolvedTopP } : {}),
      ...messageOverrides
    };
  } else {
    requestUrl = requestUrl || '';
    if (!requestUrl) {
      throw new Error('Custom provider requires a base URL.');
    }
    requestHeaders = {
      ...requestHeaders,
      Authorization: `Bearer ${apiKey}`
    };
    requestBody = {
      model: modelName,
      temperature: resolvedTemperature,
      messages: [
        {
          role: 'system',
          content: `${roleIntro}\n${basePrompt}\n\n${schemaInstruction}`
        },
        {
          role: 'user',
          content: `Game state JSON:\n${JSON.stringify(claudeContext)}`
        }
      ],
      ...(Number.isFinite(resolvedMaxTokens) ? { max_tokens: resolvedMaxTokens } : {}),
      ...(resolvedTopP !== undefined ? { top_p: resolvedTopP } : {}),
      ...(resolvedApiConfig.reasoningEffort
        ? { reasoning_effort: resolvedApiConfig.reasoningEffort }
        : {}),
      ...messageOverrides
    };
  }

  // Make request
  console.log('[API Debug] Request URL:', requestUrl);
  console.log('[API Debug] Request Headers:', requestHeaders);
  console.log('[API Debug] Request Body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(requestBody)
  });

  console.log('[API Debug] Response Status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.log('[API Debug] Error Response:', errorText);
    throw new Error(`API request failed with status ${response.status}: ${errorText || 'No additional details'}`);
  }

  const data = await response.json();
  const messageText = getProviderMessageText(data, provider);

  return { data, messageText };
};
