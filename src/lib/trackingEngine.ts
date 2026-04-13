export type TrackingMetrics = {
  attentionScore: number;
  blinkCount: number;
  drift: number;
  recoveryTime: number;
  isDrifting: boolean;
};

export type TrackingListener = (metrics: TrackingMetrics) => void;

export interface TrackingEngine {
  start(listener: TrackingListener): void;
  stop(): void;
  reset(): void;
}