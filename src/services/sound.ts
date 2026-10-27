/**
 * Hofgeluiden.
 *
 * Everything here is synthesised with the Web Audio API rather than shipped as
 * audio files. Three reasons: no bytes added to a bundle that has a budget, no
 * extra network requests on a page that should feel instant, and no CDN or CSP
 * question about where the files come from. The cost is that a dragon roar has
 * to be built out of a filtered noise burst and a pitch sweep, which is what
 * the functions below do.
 *
 * Browsers refuse to start audio before a user gesture, so the context is
 * created lazily on the first sound — which always follows a tap or a click —
 * and resumed if it was suspended.
 */

const STORAGE_KEY = 'chorequest_sound';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = readPreference();

function readPreference(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'on';
  } catch {
    return true;
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(next: boolean): void {
  enabled = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
  } catch {
    // A blocked localStorage should not stop the sound from working this session.
  }
  if (next) void ensureContext();
}

async function ensureContext(): Promise<AudioContext | null> {
  if (typeof window === 'undefined') return null;

  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    // Deliberately quiet. This runs in a family kitchen, not a arcade.
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }

  return ctx;
}

/** Short burst of white noise, used as the breath under a roar. */
function noiseBuffer(context: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    // Slight downward bias over the burst so it decays like a breath.
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  return buffer;
}

type ToneOptions = {
  freq: number;
  /** Sweep to this frequency over the note, if given. */
  toFreq?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
};

function tone(context: AudioContext, out: GainNode, o: ToneOptions): void {
  const start = context.currentTime + (o.delay ?? 0);
  const osc = context.createOscillator();
  const env = context.createGain();

  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, start);
  if (o.toFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.toFreq), start + o.duration);
  }

  const peak = o.gain ?? 0.5;
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + o.duration);

  osc.connect(env);
  env.connect(out);
  osc.start(start);
  osc.stop(start + o.duration + 0.05);
}

/** The sounds the Hof can make. */
export type Cue =
  /** Small quest done. */
  | 'complete'
  /** Big quest, 5 XP or more. */
  | 'roar'
  /** New reward tier. */
  | 'fanfare'
  /** A coin was minted or spent. */
  | 'coin'
  /** A bounty was claimed off the board. */
  | 'claim'
  /** Het Beest stirs. */
  | 'growl'
  /** Something went wrong. */
  | 'error';

export async function play(cue: Cue): Promise<void> {
  if (!enabled) return;
  const context = await ensureContext();
  if (!context || !master) return;

  switch (cue) {
    case 'complete': {
      // Two quick rising notes — a nod, not a parade.
      tone(context, master, { freq: 660, duration: 0.1, type: 'triangle', gain: 0.4 });
      tone(context, master, { freq: 880, duration: 0.16, type: 'triangle', gain: 0.35, delay: 0.09 });
      break;
    }

    case 'roar': {
      // Low sawtooth falling hard, with a noise breath layered over it.
      tone(context, master, { freq: 180, toFreq: 55, duration: 0.62, type: 'sawtooth', gain: 0.5 });
      tone(context, master, { freq: 92, toFreq: 40, duration: 0.7, type: 'square', gain: 0.22 });

      const src = context.createBufferSource();
      const band = context.createBiquadFilter();
      const env = context.createGain();
      src.buffer = noiseBuffer(context, 0.55);
      band.type = 'bandpass';
      band.frequency.setValueAtTime(900, context.currentTime);
      band.frequency.exponentialRampToValueAtTime(220, context.currentTime + 0.5);
      band.Q.value = 1.1;
      env.gain.setValueAtTime(0.35, context.currentTime);
      env.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
      src.connect(band);
      band.connect(env);
      env.connect(master);
      src.start();
      break;
    }

    case 'fanfare': {
      // Major triad walking up, then the octave.
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        tone(context, master!, {
          freq,
          duration: i === notes.length - 1 ? 0.5 : 0.16,
          type: 'triangle',
          gain: 0.42,
          delay: i * 0.11,
        });
      });
      break;
    }

    case 'coin': {
      tone(context, master, { freq: 1180, duration: 0.09, type: 'square', gain: 0.22 });
      tone(context, master, { freq: 1760, duration: 0.22, type: 'square', gain: 0.18, delay: 0.06 });
      break;
    }

    case 'claim': {
      // A blade being drawn: fast upward sweep with a bright tail.
      tone(context, master, { freq: 300, toFreq: 1200, duration: 0.18, type: 'sawtooth', gain: 0.26 });
      tone(context, master, { freq: 1568, duration: 0.14, type: 'triangle', gain: 0.2, delay: 0.15 });
      break;
    }

    case 'growl': {
      tone(context, master, { freq: 70, toFreq: 44, duration: 0.9, type: 'sawtooth', gain: 0.4 });
      tone(context, master, { freq: 104, toFreq: 62, duration: 0.85, type: 'square', gain: 0.16 });
      break;
    }

    case 'error': {
      tone(context, master, { freq: 300, duration: 0.12, type: 'square', gain: 0.28 });
      tone(context, master, { freq: 200, duration: 0.2, type: 'square', gain: 0.26, delay: 0.1 });
      break;
    }
  }
}

/**
 * Haptics. Android Chrome supports this; iOS Safari does not implement
 * `navigator.vibrate` at all, so this is a no-op there rather than a failure.
 * Tied to the same switch as sound — one "stil" setting for the whole app.
 */
export function buzz(pattern: number | number[]): void {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Some browsers throw when the document is not focused.
  }
}

/** Sound and haptics together, for the common cases. */
export function feedback(cue: Cue): void {
  void play(cue);
  switch (cue) {
    case 'roar':
      buzz([40, 60, 90]);
      break;
    case 'fanfare':
      buzz([30, 50, 30, 50, 120]);
      break;
    case 'complete':
    case 'claim':
      buzz(28);
      break;
    case 'growl':
      buzz([80, 40, 80]);
      break;
    case 'error':
      buzz([60, 40, 60]);
      break;
    case 'coin':
      buzz(14);
      break;
  }
}
