import type { TrackingEngine, TrackingListener } from "./trackingEngine";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export class SimulatedTrackingEngine implements TrackingEngine {
  private intervalId: number | null = null;
  private blinkCount = 0;
  private attentionScore = 84;
  private drift = 1.1;
  private recoveryTime = 0.9;
  private isDrifting = false;
  private driftElapsed = 0;

  start(listener: TrackingListener) {
    if (this.intervalId) return;

    this.intervalId = window.setInterval(() => {
      const driftChance = Math.random();

      if (!this.isDrifting && driftChance < 0.035) {
        this.isDrifting = true;
        this.driftElapsed = 0;
      }

      if (this.isDrifting) {
        this.driftElapsed += 0.35;
        this.drift = clamp(this.drift + Math.random() * 0.9, 2.5, 7.5);
        this.attentionScore = clamp(
          this.attentionScore - Math.random() * 5,
          42,
          95
        );

        if (this.driftElapsed > 1.2 + Math.random() * 1.4) {
          this.isDrifting = false;
          this.recoveryTime = Number((0.7 + Math.random() * 1.8).toFixed(1));
        }
      } else {
        this.drift = clamp(this.drift + (Math.random() - 0.5) * 0.22, 0.6, 2.2);
        this.attentionScore = clamp(
          this.attentionScore + (Math.random() - 0.35) * 3,
          65,
          97
        );
      }

      if (Math.random() < 0.06) {
        this.blinkCount += 1;
      }

      listener({
        attentionScore: Number(this.attentionScore.toFixed(0)),
        blinkCount: this.blinkCount,
        drift: Number(this.drift.toFixed(1)),
        recoveryTime: Number(this.recoveryTime.toFixed(1)),
        isDrifting: this.isDrifting,
      });
    }, 350);
  }

  stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.stop();
    this.blinkCount = 0;
    this.attentionScore = 84;
    this.drift = 1.1;
    this.recoveryTime = 0.9;
    this.isDrifting = false;
    this.driftElapsed = 0;
  }
}