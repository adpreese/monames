// Shared AudioContext to prevent memory leaks
let audioContext = null;

/**
 * Gets or creates the shared AudioContext
 * @returns {AudioContext|null}
 */
const getAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn('Failed to create AudioContext:', error);
      return null;
    }
  }
  // Resume if suspended (e.g., due to browser autoplay policies)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch((error) => {
      console.warn('Failed to resume AudioContext:', error);
    });
  }
  return audioContext;
};

/**
 * Plays a success sound using Web Audio API
 */
export const playSuccessSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800; // Higher pitch for success
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (error) {
    console.warn('Audio playback failed:', error);
  }
};

/**
 * Plays a failure sound using Web Audio API
 */
export const playFailureSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 200; // Lower pitch for failure
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (error) {
    console.warn('Audio playback failed:', error);
  }
};
