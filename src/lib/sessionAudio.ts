import bell from "../assets/sounds/bell.mp3";
import introAmbient from "../assets/sounds/intro-ambient.mp3";
import fireAmbience from "../assets/sounds/fire-ambience.mp3";
import type { SessionPhase } from "./sessionScript";
import type { SessionSettings } from "./sessionSettings";

// Meditative volume levels (tuned to sit gently under the experience).
const INTRO_VOLUME = 0.3; // settling music before the diya gaze
const FIRE_VOLUME = 0.2; // fire crackle during the diya gaze through the end

// Session audio:
//   - one gong at the start, one at the end
//   - a soft music bed from the start until the diya gaze phase
//   - a fire-crackle bed from the diya gaze phase through the end
//   - a transition tone each time the eyes close / open
export class SessionAudioController {
  private bellAudio: HTMLAudioElement | null = null;
  private introBed: HTMLAudioElement | null = null;
  private fireBed: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private activeBellFade: number | null = null;
  private activeBed: "intro" | "fire" | null = null;
  private fadeIntervals = new Map<HTMLAudioElement, number>();

  async preload() {
    this.bellAudio = new Audio(bell);
    this.bellAudio.preload = "auto";
    this.bellAudio.volume = 0.5;

    this.introBed = new Audio(introAmbient);
    this.introBed.loop = true;
    this.introBed.preload = "auto";
    this.introBed.volume = 0;

    this.fireBed = new Audio(fireAmbience);
    this.fireBed.loop = true;
    this.fireBed.preload = "auto";
    this.fireBed.volume = 0;
  }

  private async getAudioContext() {
    if (typeof window === "undefined") return null;
    if (!this.audioContext) {
      const Ctx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      this.audioContext = new Ctx();
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  // Smoothly ramps an element's volume; optionally pauses when it reaches zero.
  private fade(
    audio: HTMLAudioElement,
    target: number,
    ms: number,
    pauseAtZero = false
  ) {
    const existing = this.fadeIntervals.get(audio);
    if (existing) {
      window.clearInterval(existing);
      this.fadeIntervals.delete(audio);
    }

    const steps = Math.max(1, Math.round(ms / 50));
    const start = audio.volume;
    let i = 0;

    const id = window.setInterval(() => {
      i += 1;
      const v = start + (target - start) * (i / steps);
      audio.volume = Math.min(1, Math.max(0, v));

      if (i >= steps) {
        window.clearInterval(id);
        this.fadeIntervals.delete(audio);
        audio.volume = Math.min(1, Math.max(0, target));
        if (pauseAtZero && target <= 0) audio.pause();
      }
    }, 50);

    this.fadeIntervals.set(audio, id);
  }

  // Strikes the gong and lets it ring out with a long natural fade.
  private async playBellWithFade(settings: SessionSettings) {
    if (!settings.soundEnabled || !this.bellAudio) return;

    if (this.activeBellFade) {
      window.clearInterval(this.activeBellFade);
      this.activeBellFade = null;
    }

    this.bellAudio.pause();
    this.bellAudio.currentTime = 0;
    this.bellAudio.volume = 0.5;

    try {
      await this.bellAudio.play();
    } catch {
      return;
    }

    const fadeDurationMs = 5000;
    const tickMs = 100;
    const totalSteps = fadeDurationMs / tickMs;
    let step = 0;

    this.activeBellFade = window.setInterval(() => {
      if (!this.bellAudio) return;

      step += 1;
      const nextVolume = Math.max(0, 0.5 * (1 - step / totalSteps));
      this.bellAudio.volume = nextVolume;

      if (step >= totalSteps) {
        if (this.activeBellFade) {
          window.clearInterval(this.activeBellFade);
          this.activeBellFade = null;
        }

        this.bellAudio.pause();
        this.bellAudio.currentTime = 0;
        this.bellAudio.volume = 0.5;
      }
    }, tickMs);
  }

  // Soft synthesized tone used for the eyes-open / eyes-close transitions.
  private async playToneCluster(
    settings: SessionSettings,
    config: {
      freqs: number[];
      durationSec: number;
      peakGain: number;
      attackSec: number;
      releaseSec: number;
      type?: OscillatorType;
    }
  ) {
    if (!settings.soundEnabled) return;

    const context = await this.getAudioContext();
    if (!context) return;

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(config.peakGain, now + config.attackSec);
    master.gain.exponentialRampToValueAtTime(
      0.0001,
      now + config.durationSec + config.releaseSec
    );
    master.connect(context.destination);

    config.freqs.forEach((freq, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = config.type ?? "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(index === 0 ? 1 : 0.4, now);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + index * 0.03);
      osc.stop(now + config.durationSec + config.releaseSec);
    });
  }

  // --- Public cues -----------------------------------------------------------

  // Gong that opens the session.
  async playStartGong(settings: SessionSettings) {
    await this.playBellWithFade(settings);
  }

  // Gong that closes the session.
  async playEndGong(settings: SessionSettings) {
    await this.playBellWithFade(settings);
  }

  // Eyes closing: a clear descending tone — go inward, soften. Loud enough to
  // read clearly over the fire-crackle bed.
  async playEyesCloseTransition(settings: SessionSettings) {
    await this.playToneCluster(settings, {
      freqs: [659, 523, 392],
      durationSec: 0.55,
      peakGain: 0.09,
      attackSec: 0.05,
      releaseSec: 0.95,
      type: "triangle",
    });
  }

  // Eyes opening: a gentle rising tone — return to the flame.
  async playEyesOpenTransition(settings: SessionSettings) {
    await this.playToneCluster(settings, {
      freqs: [523, 659, 784],
      durationSec: 0.45,
      peakGain: 0.07,
      attackSec: 0.05,
      releaseSec: 0.8,
      type: "sine",
    });
  }

  // --- Ambient beds ----------------------------------------------------------

  private async startIntroBed(settings: SessionSettings) {
    if (!settings.soundEnabled || !this.introBed) return;
    if (this.activeBed === "intro" && !this.introBed.paused) return;

    this.activeBed = "intro";
    if (this.fireBed && !this.fireBed.paused) this.fade(this.fireBed, 0, 1500, true);

    try {
      await this.introBed.play();
    } catch {
      return;
    }
    this.fade(this.introBed, INTRO_VOLUME, 1500);
  }

  private async startFireBed(settings: SessionSettings) {
    if (!settings.soundEnabled || !this.fireBed) return;
    if (this.activeBed === "fire" && !this.fireBed.paused) return;

    this.activeBed = "fire";
    if (this.introBed && !this.introBed.paused) this.fade(this.introBed, 0, 1800, true);

    try {
      await this.fireBed.play();
    } catch {
      return;
    }
    this.fade(this.fireBed, FIRE_VOLUME, 1800);
  }

  private pauseBeds() {
    [this.introBed, this.fireBed].forEach((audio) => {
      if (!audio) return;
      const existing = this.fadeIntervals.get(audio);
      if (existing) {
        window.clearInterval(existing);
        this.fadeIntervals.delete(audio);
      }
      if (!audio.paused) audio.pause();
    });
  }

  // Gracefully fades out whichever bed is playing — used when the session ends.
  fadeOutAmbient(ms = 4000) {
    if (this.introBed && !this.introBed.paused) this.fade(this.introBed, 0, ms, true);
    if (this.fireBed && !this.fireBed.paused) this.fade(this.fireBed, 0, ms, true);
    this.activeBed = null;
  }

  // ---------------------------------------------------------------------------
  // Phase-driven cues. Start/end gongs are fired directly by the page; this
  // manages the ambient beds and the eyes-open / eyes-close transitions.
  // ---------------------------------------------------------------------------
  async syncPhase(params: {
    phase: SessionPhase | undefined;
    previousPhaseId?: string;
    isRunning: boolean;
    isPaused: boolean;
    settings: SessionSettings;
  }) {
    const { phase, previousPhaseId, isRunning, isPaused, settings } = params;

    if (!phase) return;

    // Paused: hold the beds in place (resume picks up where it left off).
    if (isPaused) {
      this.pauseBeds();
      return;
    }

    // Not running: either pre-session or ended. Ending fades out via
    // fadeOutAmbient(); pre-session has nothing playing.
    if (!isRunning) return;

    // Fire crackle covers the diya gaze and the short eyes-closed holds; the
    // intro music bed covers everything before it. Open awareness (integrate)
    // is deliberately silent — the fire dissolves away and the only sound
    // left is the closing gong.
    const isFirePhase =
      phase.visualMode === "gaze" || phase.visualMode === "eyesClosed";

    if (phase.visualMode === "integrate") {
      this.fadeOutAmbient(3500);
    } else if (isFirePhase) {
      await this.startFireBed(settings);
    } else {
      await this.startIntroBed(settings);
    }

    const isPhaseChange = previousPhaseId !== phase.id;
    if (!isPhaseChange) return;

    // Eyes close: gaze -> eyes-closed. The move into open awareness gets no
    // tone — the fire fading out is the cue, and the phase stays quiet.
    if (previousPhaseId?.startsWith("gaze-") && phase.visualMode === "eyesClosed") {
      await this.playEyesCloseTransition(settings);
      return;
    }

    // Eyes open: eyes-closed -> gaze.
    if (previousPhaseId?.startsWith("eyes-closed-") && phase.visualMode === "gaze") {
      await this.playEyesOpenTransition(settings);
    }
  }

  async reset() {
    if (this.activeBellFade) {
      window.clearInterval(this.activeBellFade);
      this.activeBellFade = null;
    }

    this.fadeIntervals.forEach((id) => window.clearInterval(id));
    this.fadeIntervals.clear();

    if (this.bellAudio) {
      this.bellAudio.pause();
      this.bellAudio.currentTime = 0;
      this.bellAudio.volume = 0.5;
    }

    [this.introBed, this.fireBed].forEach((audio) => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
    });
    this.activeBed = null;
  }

  async cleanup() {
    await this.reset();

    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}
