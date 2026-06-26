/* Driver ride-request alert sound library — all sounds synthesised via Web Audio API (no files needed) */

export type AlertSoundId = "beep" | "chime" | "triple-ping" | "ring" | "alert";

export interface SoundOption {
  id: AlertSoundId;
  label: string;
  description: string;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: "beep",        label: "Classic Beep",   description: "Two-tone beep every 1.8 s" },
  { id: "chime",       label: "Chime",           description: "Rising bell chord, pleasant" },
  { id: "triple-ping", label: "Triple Ping",     description: "Three quick high pings" },
  { id: "ring",        label: "Phone Ring",      description: "Classic warbling ring" },
  { id: "alert",       label: "Urgent Alert",    description: "Descending tones, high priority" },
];

const LS_KEY = "driverAlertSound";

export function getPreferredSound(): AlertSoundId {
  if (typeof window === "undefined") return "chime";
  return (localStorage.getItem(LS_KEY) as AlertSoundId) ?? "chime";
}

export function setPreferredSound(id: AlertSoundId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, id);
}

/* ─── helpers ───────────────────────────────────────────────────────────────── */

function tone(
  ctx: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  peakGain = 0.35,
  type: OscillatorType = "sine",
) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

/* ─── pattern functions — play one cycle, return its duration in ms ─────────── */

function patternBeep(ctx: AudioContext): number {
  const t = ctx.currentTime;
  tone(ctx, 880,  t,       0.25);
  tone(ctx, 1100, t + 0.3, 0.25);
  return 1800;
}

function patternChime(ctx: AudioContext): number {
  const t = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => tone(ctx, f, t + i * 0.18, 0.5, 0.3));
  return 2200;
}

function patternTriplePing(ctx: AudioContext): number {
  const t = ctx.currentTime;
  [0, 0.18, 0.36].forEach(d => tone(ctx, 1400, t + d, 0.15, 0.3));
  return 1800;
}

function patternRing(ctx: AudioContext): number {
  const t = ctx.currentTime;
  for (let r = 0; r < 2; r++) {
    const base = t + r * 0.5;
    tone(ctx, 440, base,        0.2, 0.3, "sine");
    tone(ctx, 480, base + 0.22, 0.2, 0.3, "sine");
  }
  return 2000;
}

function patternAlert(ctx: AudioContext): number {
  const t = ctx.currentTime;
  [1200, 900, 600].forEach((f, i) => tone(ctx, f, t + i * 0.18, 0.18, 0.35, "sawtooth"));
  return 1800;
}

const PATTERNS: Record<AlertSoundId, (ctx: AudioContext) => number> = {
  beep:          patternBeep,
  chime:         patternChime,
  "triple-ping": patternTriplePing,
  ring:          patternRing,
  alert:         patternAlert,
};

/* ─── public API ─────────────────────────────────────────────────────────────── */

/** Play a sound once (for preview). */
export function previewSound(id: AlertSoundId, ctx: AudioContext): void {
  PATTERNS[id]?.(ctx);
}

/**
 * Start looping the chosen alert sound.
 * Returns a stop() function — call it to silence immediately.
 */
export function startAlertLoop(id: AlertSoundId, ctx: AudioContext): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;

  const cycle = () => {
    if (stopped || ctx.state === "closed") return;
    const intervalMs = PATTERNS[id]?.(ctx) ?? 2000;
    timer = setTimeout(cycle, intervalMs);
  };

  cycle();

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
