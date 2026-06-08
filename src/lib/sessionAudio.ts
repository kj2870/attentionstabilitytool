import bell from "../assets/sounds/bell.mp3";
import type { SessionPhase } from "./sessionScript";
import type { SessionSettings } from "./sessionSettings";

// Minimal session audio:
//   - one gong at the start, one at the end
//   - a soft transition tone each time the eyes close / open
//   - no continuous ambient bed
export class SessionAudioController {
  private bellAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private activeBellFade: number | null = null;

  async preload() {
    this.bellAudio = new Audio(bell);
    this.bellAudio.preload = "auto";
    this.bellAudio.volume = 0.5;
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

  // Eyes closing: a gentle descending tone — go inward, soften.
  async playEyesCloseTransition(settings: SessionSettings) {
    await this.playToneCluster(settings, {
      freqs: [659, 523, 392],
      durationSec: 0.5,
      peakGain: 0.024,
      attackSec: 0.08,
      releaseSec: 0.9,
      type: "triangle",
    });
  }

  // Eyes opening: a gentle rising tone — return to the flame.
  async playEyesOpenTransition(settings: SessionSettings) {
    await this.playToneCluster(settings, {
      freqs: [523, 659, 784],
      durationSec: 0.42,
      peakGain: 0.022,
      attackSec: 0.06,
      releaseSec: 0.7,
      type: "sine",
    });
  }

  // ---------------------------------------------------------------------------
  // Phase-driven cues. Start/end gongs are fired directly by the page; this
  // only handles the in-session eyes-open / eyes-close transitions.
  // ---------------------------------------------------------------------------
  async syncPhase(params: {
    phase: SessionPhase | undefined;
    previousPhaseId?: string;
    isRunning: boolean;
    settings: SessionSettings;
  }) {
    const { phase, previousPhaseId, isRunning } = params;
    const { settings } = params;

    if (!phase || !isRunning) return;

    const isPhaseChange = previousPhaseId !== phase.id;
    if (!isPhaseChange) return;

    // Eyes close: gaze -> eyes-closed, or the final gaze -> open awareness
    // (integrate is also done with eyes closed).
    if (
      previousPhaseId?.startsWith("gaze-") &&
      (phase.visualMode === "eyesClosed" || phase.visualMode === "integrate")
    ) {
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

    if (this.bellAudio) {
      this.bellAudio.pause();
      this.bellAudio.currentTime = 0;
      this.bellAudio.volume = 0.5;
    }
  }

  async cleanup() {
    await this.reset();

    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}
