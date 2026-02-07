"use client";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", vol = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available — silently ignore
  }
}

/** Phase completed — ascending two-note chime */
export function soundPhaseComplete() {
  playTone(523, 0.15, "sine", 0.1); // C5
  setTimeout(() => playTone(659, 0.2, "sine", 0.1), 120); // E5
}

/** Orders submitted — short click */
export function soundOrderSubmitted() {
  playTone(880, 0.08, "triangle", 0.08);
}

/** Message received — soft ping */
export function soundMessageReceived() {
  playTone(740, 0.12, "sine", 0.06);
}

/** Game halted / error — low tone */
export function soundGameHalted() {
  playTone(220, 0.3, "sawtooth", 0.08);
}
