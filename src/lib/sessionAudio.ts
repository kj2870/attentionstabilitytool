import bell from "../assets/sounds/bell.mp3";
import brownNoise from "../assets/sounds/brown-noise.flac";
import type { SessionPhase } from "./sessionScript";
import type { SessionSettings } from "./sessionSettings";

export class SessionAudioController {
  private fireAudio: HTMLAudioElement | null = null;
  private bellAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private fireSoundPlaying = false;
  private activeBellFade: number | null = null;

  async preload() {
    this.fireAudio = new Audio(brownNoise);
    this.fireAudio.loop = true;
    this.fireAudio.volume = 0.11;

    this.bellAudio = new Audio(bell);
    this.bellAudio.preload = "auto";
    this.bellAudio.volume = 0.48;
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
      gain.gain.setValueAtTime(index === 0 ? 1 : 0.45, now);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + index * 0.02);
      osc.stop(now + config.durationSec + config.releaseSec);
    });
  }

  async playOpeningBell(settings: SessionSettings) {
    await this.playBellWithFade(settings);
  }

  async playClosingBell(settings: SessionSettings) {
    await this.stopFireSound();
    await this.playBellWithFade(settings);
  }

  async playSoftTransitionCue(settings: SessionSettings) {
    await this.playToneCluster(settings, {
      freqs: [1046, 1318, 1568],
      durationSec: 0.42,
      peakGain: 0.022,
      attackSec: 0.06,
      releaseSec: 0.6,
      type: "sine",
    });
  }

  async playAwarenessCue(settings: SessionSettings) {
    await this.playToneCluster(settings, {
      freqs: [392, 523, 659],
      durationSec: 0.65,
      peakGain: 0.026,
      attackSec: 0.08,
      releaseSec: 0.95,
      type: "triangle",
    });
  }

  async startFireSound(settings: SessionSettings) {
    if (!settings.soundEnabled || !settings.fireSoundEnabled) return;
    if (this.fireSoundPlaying || !this.fireAudio) return;

    this.fireAudio.volume = 0.11;
    this.fireSoundPlaying = true;

    try {
      await this.fireAudio.play();
    } catch {
      this.fireSoundPlaying = false;
    }
  }

  async stopFireSound() {
    if (!this.fireAudio) return;

    this.fireSoundPlaying = false;
    this.fireAudio.pause();
    this.fireAudio.currentTime = 0;
  }

  async syncPhase(params: {
    phase: SessionPhase | undefined;
    previousPhaseId?: string;
    isRunning: boolean;
    settings: SessionSettings;
  }) {
    const { phase, previousPhaseId, isRunning, settings } = params;

    if (!phase || !isRunning) {
      await this.stopFireSound();
      return;
    }

    const isPhaseChange = previousPhaseId !== phase.id;
    const isAmbientPhase =
      phase.visualMode === "gaze" ||
      phase.visualMode === "eyesClosed" ||
      phase.visualMode === "integrate";

    if (
      isPhaseChange &&
      previousPhaseId?.startsWith("settle") &&
      phase.visualMode === "body"
    ) {
      await this.playOpeningBell(settings);
    }

    if (
      isPhaseChange &&
      ((previousPhaseId?.startsWith("gaze-") && phase.visualMode === "eyesClosed") ||
        (previousPhaseId?.startsWith("eyes-closed-") && phase.visualMode === "gaze"))
    ) {
      await this.playSoftTransitionCue(settings);
    }

    if (
      isPhaseChange &&
      previousPhaseId?.startsWith("eyes-closed-") &&
      phase.visualMode === "integrate"
    ) {
      await this.playAwarenessCue(settings);
    }

    if (isAmbientPhase) {
      await this.startFireSound(settings);
    } else {
      await this.stopFireSound();
    }
  }

  async reset() {
    if (this.activeBellFade) {
      window.clearInterval(this.activeBellFade);
      this.activeBellFade = null;
    }

    await this.stopFireSound();

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
