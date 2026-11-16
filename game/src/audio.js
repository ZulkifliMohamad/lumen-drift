// All sound is synthesized with the Web Audio API: no audio files, no network. Every effect
// is a short oscillator or noise burst through a gain envelope, and a quiet two-oscillator pad
// hums underneath play. Sound starts on the first user gesture (browsers block audio before
// one) and M toggles mute.

export function createAudio() {
  let context = null;
  let master = null;
  let pad = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** Resume (or create) the context from a user gesture; safe to call any time. */
  function unlock() {
    if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
  }

  function tone(startFreq, endFreq, duration, type, volume, delay = 0) {
    if (!ensure() || muted || context.state !== 'running') return;
    const t0 = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function noise(duration, volume, lowpass) {
    if (!ensure() || muted || context.state !== 'running') return;
    const t0 = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t0);
  }

  return {
    unlock,
    shoot() { tone(880, 220, 0.09, 'square', 0.08); },
    enemyShoot() { tone(320, 140, 0.16, 'sawtooth', 0.05); },
    explode(big = false) {
      noise(big ? 0.5 : 0.28, big ? 0.35 : 0.2, big ? 900 : 1400);
      tone(big ? 160 : 220, 40, big ? 0.45 : 0.25, 'sine', 0.25);
    },
    hit() { tone(200, 60, 0.3, 'sawtooth', 0.3); noise(0.2, 0.25, 800); },
    pickup() { tone(660, 990, 0.1, 'sine', 0.14); tone(990, 1320, 0.12, 'sine', 0.12, 0.07); },
    dash() { noise(0.18, 0.14, 3200); },
    waveHorn() { tone(196, 196, 0.35, 'triangle', 0.16); tone(294, 294, 0.4, 'triangle', 0.14, 0.12); },
    upgrade() { tone(523, 523, 0.12, 'sine', 0.15); tone(659, 659, 0.12, 'sine', 0.15, 0.1); tone(784, 784, 0.2, 'sine', 0.15, 0.2); },
    over() { tone(330, 55, 0.9, 'sawtooth', 0.2); },
    startPad() {
      if (!ensure() || pad) return;
      try {
        pad = context.createGain();
        pad.gain.value = 0.035;
        pad.connect(master);
        for (const freq of [55, 82.5, 110.3]) {
          const osc = context.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.connect(pad);
          osc.start();
        }
      } catch {
        pad = null;
      }
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() { return muted; },
  };
}
