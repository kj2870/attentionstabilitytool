import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// Per-frame eye metrics derived from MediaPipe face landmarks.
// Values are normalized to video frame coordinates (0..1 space).
export type EyeMetricsSnapshot = {
  // Whether a face with usable landmarks was found this frame.
  facePresent: boolean;
  // Vertical eyelid gap estimates for each eye.
  leftEyeOpen: number;
  rightEyeOpen: number;
  // Mean of left/right openness, used as the primary eye signal.
  eyeOpenAvg: number;
  // Convenience flag for "closed-like" eye state in this frame.
  blinkLikely: boolean;
  // Hysteresis-based eye state used by the blink event logic.
  eyeState: "open" | "closed";
};

// Landmark indices for upper/lower eyelid points.
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;

export class SessionFaceLandmarker {
  private landmarker: FaceLandmarker | null = null;
  private initializing = false;

  // Initializes the MediaPipe Face Landmarker once.
  // Safe to call repeatedly; concurrent init calls are ignored.
  async init() {
    if (this.landmarker || this.initializing) return;

    this.initializing = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      this.landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        },
        runningMode: "VIDEO",
        numFaces: 1,
      });
    } finally {
      this.initializing = false;
    }
  }

  // Runs landmark inference for a single video frame.
  // Input: a ready HTMLVideoElement.
  // Output: eye metrics snapshot, or null when detection cannot run safely.
  detect(video: HTMLVideoElement): EyeMetricsSnapshot | null {
    if (!this.landmarker) return null;
    if (video.readyState < 2) return null;
    if (!video.videoWidth || !video.videoHeight) return null;

    const result = this.landmarker.detectForVideo(video, performance.now());
    const landmarks = result.faceLandmarks?.[0];

    // Edge case: no usable landmarks this frame.
    if (!landmarks || landmarks.length === 0) {
      return {
        facePresent: false,
        leftEyeOpen: 0,
        rightEyeOpen: 0,
        eyeOpenAvg: 0,
        blinkLikely: false,
        eyeState: "open",
      };
    }

    const leftEyeOpen = Math.abs(
      landmarks[LEFT_EYE_TOP].y - landmarks[LEFT_EYE_BOTTOM].y
    );

    const rightEyeOpen = Math.abs(
      landmarks[RIGHT_EYE_TOP].y - landmarks[RIGHT_EYE_BOTTOM].y
    );

    const eyeOpenAvg = (leftEyeOpen + rightEyeOpen) / 2;

    // Hysteresis thresholds reduce flicker near boundary values.
    let eyeState: "open" | "closed" = "open";
    if (eyeOpenAvg < 0.0105) {
      eyeState = "closed";
    } else if (eyeOpenAvg > 0.0145) {
      eyeState = "open";
    }

    const blinkLikely = eyeState === "closed";

    return {
      facePresent: true,
      leftEyeOpen,
      rightEyeOpen,
      eyeOpenAvg,
      blinkLikely,
      eyeState,
    };
  }

  // Releases MediaPipe resources.
  close() {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
