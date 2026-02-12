/**
 * Utility function to wait for a specified duration
 * @param {number} durationMs - Duration to wait in milliseconds
 * @returns {Promise<void>}
 */
export const wait = (durationMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
