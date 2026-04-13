import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

export type FaceDetectionSnapshot = {
  facePresent: boolean;
  faceCount: number;
  confidence: number;
  centered: boolean;
};

export class SessionFaceDetector {
  private detector: FaceDetector | null = null;
  private initializing = false;

  async init() {
    if (this.detector || this.initializing) return;

    this.initializing = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      this.detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.5,
      });
    } finally {
      this.initializing = false;
    }
  }

  detect(video: HTMLVideoElement): FaceDetectionSnapshot | null {
    if (!this.detector) return null;
    if (video.readyState < 2) return null;
    if (!video.videoWidth || !video.videoHeight) return null;

    const result = this.detector.detectForVideo(video, performance.now());
    const detections = result.detections ?? [];

    if (detections.length === 0) {
      return {
        facePresent: false,
        faceCount: 0,
        confidence: 0,
        centered: false,
      };
    }

    const first = detections[0];
    const score = first.categories?.[0]?.score ?? 0;
    const box = first.boundingBox;

    if (!box) {
      return {
        facePresent: true,
        faceCount: detections.length,
        confidence: score,
        centered: false,
      };
    }

    const centerX = (box.originX + box.width / 2) / video.videoWidth;
    const centerY = (box.originY + box.height / 2) / video.videoHeight;

    const centered =
      centerX >= 0.35 &&
      centerX <= 0.65 &&
      centerY >= 0.25 &&
      centerY <= 0.75;

    return {
      facePresent: true,
      faceCount: detections.length,
      confidence: score,
      centered,
    };
  }

  close() {
    this.detector?.close();
    this.detector = null;
  }
}