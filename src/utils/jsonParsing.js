/**
 * Extracts JSON from text that may contain markdown fences or surrounding text
 * @param {string} text - Text potentially containing JSON
 * @returns {string|null} Extracted JSON string or null
 */
export const extractJson = (text) => {
  if (!text) return null;
  const trimmed = text.trim();

  // Check if it's already plain JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  // Check for markdown code fence
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    return fenced[1].trim();
  }

  // Extract JSON between first { and last }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return null;
};

/**
 * Parses Claude's response text into a JSON payload
 * Handles markdown fences, nested JSON strings, and plain JSON
 * @param {string} messageText - Claude's response text
 * @returns {Object|null} Parsed payload or null
 * @throws {Error} If JSON parsing fails with details about the error
 */
export const parseClaudePayload = (messageText) => {
  if (!messageText) return null;

  // Try to extract JSON first
  const directJson = extractJson(messageText);
  if (directJson) {
    try {
      return JSON.parse(directJson);
    } catch (error) {
      // Log and re-throw with more context
      console.warn('Failed to parse extracted JSON:', directJson);
      throw new Error(`JSON parsing failed: ${error.message}`);
    }
  }

  // Try parsing as-is (might be double-encoded)
  try {
    const parsed = JSON.parse(messageText);

    // Handle double-encoded JSON
    if (typeof parsed === 'string') {
      const nestedJson = extractJson(parsed);
      if (nestedJson) {
        try {
          return JSON.parse(nestedJson);
        } catch (error) {
          console.warn('Failed to parse nested JSON:', nestedJson);
          throw new Error(`Nested JSON parsing failed: ${error.message}`);
        }
      }
    }

    // Return if it's an object
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (error) {
    // Only log if not already a parsing error we threw
    if (!error.message.includes('JSON parsing failed')) {
      console.warn('Unable to parse Claude JSON payload:', error);
      throw new Error(`JSON parsing failed: ${error.message}`);
    }
    throw error;
  }

  return null;
};
