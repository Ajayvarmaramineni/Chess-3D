let context: AudioContext | undefined;
let masterGain: GainNode | undefined;
let compressor: DynamicsCompressorNode | undefined;
let currentVolume = 0.7;
let isMutedState = false;

function ensureAudioContext(): AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  if (!context) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      context = new AudioContextClass();
      compressor = context.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, context.currentTime);
      compressor.knee.setValueAtTime(12, context.currentTime);
      compressor.ratio.setValueAtTime(6, context.currentTime);
      compressor.attack.setValueAtTime(0.003, context.currentTime);
      compressor.release.setValueAtTime(0.25, context.currentTime);
      compressor.connect(context.destination);

      masterGain = context.createGain();
      masterGain.gain.setValueAtTime(isMutedState ? 0 : currentVolume, context.currentTime);
      masterGain.connect(compressor);
    }
  }
  return context;
}

export function unlockSound() {
  const ctx = ensureAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
}

export function setVolume(volume: number) {
  currentVolume = Math.max(0, Math.min(1, volume));
  if (context && masterGain && !isMutedState) {
    masterGain.gain.setTargetAtTime(currentVolume, context.currentTime, 0.03);
  }
}

export function getVolume(): number {
  return currentVolume;
}

export function setMuted(muted: boolean) {
  isMutedState = muted;
  if (context && masterGain) {
    masterGain.gain.setTargetAtTime(muted ? 0 : currentVolume, context.currentTime, 0.03);
  }
}

export function isMuted(): boolean {
  return isMutedState;
}

export function playChessSound(kind: string, square?: string) {
  if (isMutedState) return;
  const ctx = ensureAudioContext();
  if (!ctx || ctx.state !== 'running' || !masterGain) return;

  const notes =
    kind === 'checkmate'
      ? [392, 494, 587, 784]
      : kind === 'check'
        ? [330, 440]
        : kind === 'promotion'
          ? [523, 659, 784]
          : kind === 'capture'
            ? [180, 440]
            : [650];

  notes.forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    const start = ctx.currentTime + i * 0.085;

    osc.type = kind === 'capture' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(frequency, start);

    // Subtle pitch decay for crystal tactile response
    if (kind === 'move' || kind === 'capture') {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.85), start + 0.25);
    }

    noteGain.gain.setValueAtTime(0, start);
    noteGain.gain.linearRampToValueAtTime(0.12, start + 0.012);
    noteGain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

    // Spatial panning based on file (a=0 -> -0.85, h=7 -> +0.85)
    if (square && square.length >= 2) {
      const fileChar = square[0].toLowerCase();
      const fileIndex = fileChar.charCodeAt(0) - 97; // 0 for 'a', 7 for 'h'
      pan.pan.value = Math.max(-0.9, Math.min(0.9, (fileIndex - 3.5) / 4));
    } else {
      pan.pan.value = 0;
    }

    osc.connect(noteGain);
    noteGain.connect(pan);
    pan.connect(masterGain!);

    osc.start(start);
    osc.stop(start + 0.4);
  });
}
