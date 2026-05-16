import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// Per-frame eye metrics derived from MediaPipe face landmarks.
// All values are normalised to video frame coordinates (0..1 space).
export type EyeMetricsSnapshot = {
  // Whether a face with usable landmarks was found this frame.
  facePresent: boolean;
  // Vertical eyelid gap estimates (legacy single-pair measure, kept for back-compat).
  leftEyeOpen: number;
  rightEyeOpen: number;
  // Mean of left/right openness — used by the existing blink event logic.
  eyeOpenAvg: number;
  // Convenience flag for "closed-like" eye state in this frame.
  blinkLikely: boolean;
  // Hysteresis-based eye state used by the blink event logic.
  eyeState: "open" | "closed";

  // --- New fields for confident gaze tracking ---
  // Eye Aspect Ratio (EAR) per eye — robust to head tilt and distance.
  leftEAR: number;
  rightEAR: number;
  // Mean EAR of both eyes; primary signal for "eyes open" going forward.
  earAvg: number;
  // Iris centre position normalised within each eye socket.
  // x: 0 = looking outward, 0.5 = centred, 1 = looking inward.
  // y: 0 = looking up, 0.5 = centred, 1 = looking down.
  // Both expressed relative to the eye's own corners so they're invariant to head pose.
  leftIrisX: number;
  leftIrisY: number;
  rightIrisX: number;
  rightIrisY: number;
  // Mean iris position across both eyes (the "gaze direction" signal).
  irisX: number;
  irisY: number;
  // True if iris landmarks were available (model has them by default but be defensive).
  irisAvailable: boolean;
};

// --- Landmark indices (MediaPipe Face Landmarker, 478-point mesh) ---
// Single eyelid pair (legacy, used by existing blink logic).
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;

// Six points per eye for Eye Aspect Ratio (EAR).
// Order: outer corner, upper-outer, upper-inner, inner corner, lower-inner, lower-outer.
const LEFT_EYE_EAR = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_EAR = [362, 385, 387, 263, 373, 380];

// Iris centres (provided by MediaPipe's iris refinement, included by default in the .task model).
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;

type Pt = { x: number; y: number };

function dist(a: Pt, b: Pt): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Standard Eye Aspect Ratio computation. Returns ~0.30+ for open, ~0.10 for closed.
function computeEAR(landmarks: Pt[], idx: number[]): number {
  const p1 = landmarks[idx[0]];
  const p2 = landmarks[idx[1]];
  const p3 = landmarks[idx[2]];
  const p4 = landmarks[idx[3]];
  const p5 = landmarks[idx[4]];
  const p6 = landmarks[idx[5]];
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0;

  const horizontal = dist(p1, p4);
  if (horizontal === 0) return 0;

  return (dist(p2, p6) + dist(p3, p5)) / (2 * horizontal);
}

// Returns iris position relative to its own eye socket, normalised 0..1 in both axes.
// Uses the outer/inner corners and the top/bottom eyelid landmarks to define the local frame.
function computeIrisPosition(
  landmarks: Pt[],
  irisCenterIdx: number,
  outerIdx: number,
  innerIdx: number,
  topIdx: number,
  bottomIdx: number
): { x: number; y: number; available: boolean } {
  const iris = landmarks[irisCenterIdx];
  if (!iris) return { x: 0.5, y: 0.5, available: false };

  const outer = landmarks[outerIdx];
  const inner = landmarks[innerIdx];
  const top = landmarks[topIdx];
  const bottom = landmarks[bottomIdx];

  if (!outer || !inner || !top || !bottom) {
    return { x: 0.5, y: 0.5, available: false };
  }

  // Order corners by x so the normalisation is consistent regardless of which eye.
  const xMin = Math.min(outer.x, inner.x);
  const xMax = Math.max(outer.x, inner.x);
  const yMin = Math.min(top.y, bottom.y);
  const yMax = Math.max(top.y, bottom.y);

  const w = xMax - xMin;
  const h = yMax - yMin;

  if (w === 0 || h === 0) return { x: 0.5, y: 0.5, available: false };

  return {
    x: (iris.x - xMin) / w,
    y: (iris.y - yMin) / h,
    available: true,
  };
}

export class SessionFaceLandmarker {
  private landmarker: FaceLandmarker | null = null;
  private initializing = false;

  // Initialises the MediaPipe Face Landmarker once.
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
  // Output: full eye metrics snapshot, or null when detection cannot run safely.
  detect(video: HTMLVideoElement): EyeMetricsSnapshot | null {
    if (!this.landmarker) return null;
    if (video.readyState < 2) return null;
    if (!video.videoWidth || !video.videoHeight) return null;

    const result = this.landmarker.detectForVideo(video, performance.now());
    const landmarks = result.faceLandmarks?.[0];

    if (!landmarks || landmarks.length === 0) {
      return {
        facePresent: false,
        leftEyeOpen: 0,
        rightEyeOpen: 0,
        eyeOpenAvg: 0,
        blinkLikely: false,
        eyeState: "open",
        leftEAR: 0,
        rightEAR: 0,
        earAvg: 0,
        leftIrisX: 0.5,
        leftIrisY: 0.5,
        rightIrisX: 0.5,
        rightIrisY: 0.5,
        irisX: 0.5,
        irisY: 0.5,
        irisAvailable: false,
      };
    }

    // --- Legacy single-pair measure (kept so existing blink code keeps working) ---
    const leftEyeOpen = Math.abs(
      landmarks[LEFT_EYE_TOP].y - landmarks[LEFT_EYE_BOTTOM].y
    );
    const rightEyeOpen = Math.abs(
      landmarks[RIGHT_EYE_TOP].y - landmarks[RIGHT_EYE_BOTTOM].y
    );
    const eyeOpenAvg = (leftEyeOpen + rightEyeOpen) / 2;

    // --- Hysteresis on legacy signal so existing blink detection keeps its tuning ---
    let eyeState: "open" | "closed" = "open";
    if (eyeOpenAvg < 0.0105) {
      eyeState = "closed";
    } else if (eyeOpenAvg > 0.0145) {
      eyeState = "open";
    }
    const blinkLikely = eyeState === "closed";

    // --- New robust signals ---
    const leftEAR = computeEAR(landmarks, LEFT_EYE_EAR);
    const rightEAR = computeEAR(landmarks, RIGHT_EYE_EAR);
    const earAvg = (leftEAR + rightEAR) / 2;

    const leftIris = computeIrisPosition(
      landmarks,
      LEFT_IRIS_CENTER,
      33,
      133,
      LEFT_EYE_TOP,
      LEFT_EYE_BOTTOM
    );
    const rightIris = computeIrisPosition(
      landmarks,
      RIGHT_IRIS_CENTER,
      263,
      362,
      RIGHT_EYE_TOP,
      RIGHT_EYE_BOTTOM
    );

    const irisAvailable = leftIris.available && rightIris.available;
    const irisX = (leftIris.x + rightIris.x) / 2;
    const irisY = (leftIris.y + rightIris.y) / 2;

    return {
      facePresent: true,
      leftEyeOpen,
      rightEyeOpen,
      eyeOpenAvg,
      blinkLikely,
      eyeState,
      leftEAR,
      rightEAR,
      earAvg,
      leftIrisX: leftIris.x,
      leftIrisY: leftIris.y,
      rightIrisX: rightIris.x,
      rightIrisY: rightIris.y,
      irisX,
      irisY,
      irisAvailable,
    };
  }

  // Releases MediaPipe resources.
  close() {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
