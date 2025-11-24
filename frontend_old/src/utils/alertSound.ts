// Alert sound generation utility
// This creates a simple beep sound programmatically to avoid depending on external audio files

export const generateAlertSound = (): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create a simple beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Resolve after sound completes
      oscillator.onended = () => {
        audioContext.close();
        resolve();
      };
    } catch (error) {
      console.warn('Could not generate alert sound:', error);
      resolve();
    }
  });
};

export const playAlertSound = async () => {
  try {
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      await generateAlertSound();
    }
  } catch (error) {
    console.warn('Could not play alert sound:', error);
  }
};