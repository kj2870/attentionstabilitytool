import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import MeditationBackground from "../components/MeditationBackground";
import BodyGuideOverlay from "../components/BodyGuideOverlay";
import BreathGuide from "../components/BreathGuide";
import SettleHalo from "../components/SettleHalo";
import BrushstrokeEyes from "../components/BrushstrokeEyes";
import type { TrackingMetrics } from "../lib/trackingEngine";
import {
  createSessionScript,
  getScriptTotalDuration,
  type BodyRegion,
  type SessionPhase,
} from "../lib/sessionScript";
import {
  loadHistory,
  saveSession,
  saveSessionRemote,
  type SessionFeeling,
} from "../lib/storage";
import { detectNewlyUnlocked, milestoneLabel } from "../lib/milestones";
import { SessionAudioController } from "../lib/sessionAudio";
import {
  defaultSessionSettings,
  type SessionSettings,
} from "../lib/sessionSettings";
import {
  SessionFaceDetector,
  type FaceDetectionSnapshot,
} from "../lib/faceDetection";
import {
  SessionFaceLandmarker,
  type EyeMetricsSnapshot,
} from "../lib/faceLandmarks";
// Maps body-region IDs from the session script to user-facing labels.
const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  feet: "Feet",
  calves: "Calves",
  thighs: "Thighs",
  pelvis: "Pelvis and abs",
  backShoulders: "Back and shoulders",
  armsFingers: "Arms",
  neck: "Neck",
  face: "Face",
};

// Computes arithmetic mean; returns 0 for empty arrays.
function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function standardDeviation(values: number[]) {
  if (values.length === 0) return 0;
  const mean = avg(values);
  const variance = avg(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

// Shared style: stack a visual layer absolutely at the center of its parent so
// cross-fading siblings never push each other off-axis.
const ABSOLUTE_CENTER_LAYER: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// Keeps children mounted while fading out; fades in on activate — true cross-fade.
function FadeWrapper({
  active,
  durationMs = 900,
  style,
  children,
}: {
  active: boolean;
  durationMs?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(active);
  const [opacity, setOpacity] = useState(active ? 1 : 0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    if (active) {
      setMounted(true);
      const rId = requestAnimationFrame(() => setOpacity(1));
      return () => cancelAnimationFrame(rId);
    } else {
      setOpacity(0);
      timerRef.current = setTimeout(() => setMounted(false), durationMs);
    }
  }, [active, durationMs]);

  if (!mounted) return null;
  return (
    <div style={{ ...style, opacity, transition: `opacity ${durationMs}ms ease-in-out` }}>
      {children}
    </div>
  );
}

// Sequential text cross-fade: fades opacity to 0, swaps content, fades back to 1.
function useCrossFadeText(text: string, halfDurationMs = 450) {
  const [displayed, setDisplayed] = useState(text);
  const [opacity, setOpacity] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (text === displayed) return;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setOpacity(0);
    timerRef.current = setTimeout(() => {
      setDisplayed(text);
      setOpacity(1);
    }, halfDurationMs);
  }, [text]);

  return { displayed, opacity };
}

function attachStreamToVideo(
  video: HTMLVideoElement | null,
  stream: MediaStream | null
) {
  if (!video) return;

  if (!stream) {
    video.srcObject = null;
    return;
  }

  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }

  void video.play().catch(() => {
    /* ignore autoplay/play race; stream remains attached */
  });
}

// In the body phase, first 5 seconds are clench and last 5 are release.
function getBodyCue(phaseSecondsLeft: number) {
  return phaseSecondsLeft > 5 ? "Clench" : "Release";
}

type CameraState = "idle" | "requesting" | "granted" | "denied" | "error";

type SparklineProps = {
  values: number[];
  height?: number;
  stroke?: string;
  minValue?: number;
  maxValue?: number;
};

type TrendCardProps = {
  title: string;
  values: number[];
  currentLabel: string;
  minLabel: string;
  maxLabel: string;
  minValue: number;
  maxValue: number;
  stroke?: string;
};
type SignalQuality = "good" | "fair" | "poor";

type PanelState = {
  graphs: boolean;
};

type CollapsibleCardProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

type QualityWindowSnapshot = {
  faceRecent: boolean;
  eyeRecent: boolean;
  validRatio: number;
  missedRatio: number;
  opennessRecentValid: boolean;
};

function isPlausibleEyeOpenness(value: number | null | undefined) {
  if (value == null) return false;
  return value > 0.003 && value < 0.08;
}

function deriveSignalQuality(window: QualityWindowSnapshot): SignalQuality {
  if (!window.faceRecent || !window.eyeRecent) return "poor";
  if (!window.opennessRecentValid) return "poor";
  if (window.validRatio >= 0.72 && window.missedRatio <= 0.28) return "good";
  if (window.validRatio >= 0.4) return "fair";
  return "poor";
}

function Sparkline({
  values,
  height = 58,
  stroke = "rgba(233, 220, 203, 0.9)",
  minValue,
  maxValue,
}: SparklineProps) {
  const resolvedMin =
    minValue ?? (values.length > 0 ? Math.min(...values) : 0);
  const resolvedMax =
    maxValue ?? (values.length > 0 ? Math.max(...values) : 1);

  if (values.length === 0) {
    return (
      <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke="rgba(245,233,218,0.28)"
          strokeWidth="2"
        />
      </svg>
    );
  }

  const range = resolvedMax - resolvedMin || 1;

  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const clamped = clamp(value, resolvedMin, resolvedMax);
      const y = 100 - ((clamped - resolvedMin) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function TrendCard({
  title,
  values,
  currentLabel,
  minLabel,
  maxLabel,
  minValue,
  maxValue,
  stroke,
}: TrendCardProps) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        padding: "10px",
        background: "rgba(0,0,0,0.16)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <div style={{ fontSize: "12px", color: "#cbbba7" }}>{title}</div>
        <div style={{ fontSize: "11px", color: "rgba(245,233,218,0.72)" }}>
          {currentLabel}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "38px minmax(0, 1fr)",
          gap: "8px",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontSize: "10px",
            color: "rgba(245,233,218,0.58)",
            lineHeight: 1.2,
            paddingTop: "2px",
            paddingBottom: "2px",
          }}
        >
          <div>{maxLabel}</div>
          <div>{minLabel}</div>
        </div>

        <Sparkline
          values={values}
          height={64}
          stroke={stroke}
          minValue={minValue}
          maxValue={maxValue}
        />
      </div>
    </div>
  );
}
function CollapsibleCard({ title, open, onToggle, children }: CollapsibleCardProps) {
  return (
    <div
      className="glass-card"
      style={{
        width: "100%",
        maxWidth: "760px",
        padding: "12px 14px",
        textAlign: "left",
        background: "rgba(255, 179, 71, 0.02)",
        border: "1px solid rgba(255, 179, 71, 0.06)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "transparent",
          border: "none",
          color: "rgba(245,233,218,0.7)",
          padding: 0,
          cursor: "pointer",
          fontSize: "13px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        <span>{title}</span>
        <span style={{
          fontSize: "18px",
          lineHeight: 1,
          color: "rgba(255,179,71,0.6)",
          transition: "transform 0.2s ease",
          display: "inline-block",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          ›
        </span>
      </button>

      {open && <div style={{ marginTop: "12px" }}>{children}</div>}
    </div>
  );
}

// Main guided-session screen.
// Coordinates timer phases, audio cues, webcam/vision loops, and summary UI.
export default function SessionPage() {
  const navigate = useNavigate();
  const script = useMemo(() => createSessionScript(), []);
  const totalDuration = useMemo(() => getScriptTotalDuration(script), [script]);

  const audioRef = useRef(new SessionAudioController());
  const faceDetectorRef = useRef(new SessionFaceDetector());
  const faceLandmarkerRef = useRef(new SessionFaceLandmarker());
  const previousPhaseIdRef = useRef<string | undefined>(script[0]?.id);
  const sessionVideoRef = useRef<HTMLVideoElement | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [faceStatus, setFaceStatus] = useState("idle");
  const [faceSnapshot, setFaceSnapshot] = useState<FaceDetectionSnapshot | null>(null);
  const [eyeStatus, setEyeStatus] = useState("idle");
  const [eyeSnapshot, setEyeSnapshot] = useState<EyeMetricsSnapshot | null>(null);
  const blinkStateRef = useRef<"open" | "closed">("open");
  const blinkStartTimeRef = useRef<number | null>(null);
  const lastBlinkAtRef = useRef<number>(0);
  const [blinkCountLive, setBlinkCountLive] = useState(0);
  const [eyeOpennessHistory, setEyeOpennessHistory] = useState<number[]>([]);
  const [attentionHistory, setAttentionHistory] = useState<number[]>([]);
  const [blinkRateHistory, setBlinkRateHistory] = useState<number[]>([]);
  const [closureBurdenHistory, setClosureBurdenHistory] = useState<number[]>([]);
  const lastEyeTrendSampleAtRef = useRef(0);
  const lastDerivedTrendSampleAtRef = useRef(0);
  const blinkEventTimesRef = useRef<number[]>([]);
  const closureDurationsRef = useRef<number[]>([]);
  const longClosureTimesRef = useRef<number[]>([]);
  const closureSampleStatesRef = useRef<boolean[]>([]);

  const [signalQuality, setSignalQuality] = useState<SignalQuality>("poor");
  const lastFaceSeenAtRef = useRef<number>(0);
  const lastValidEyeAtRef = useRef<number>(0);
  const recentEyeValidityRef = useRef<boolean[]>([]);
  const lastValidAttentionScoreRef = useRef<number>(84);
  const [panelsOpen, setPanelsOpen] = useState<PanelState>({
    graphs: false,
  });
  // --- Phase 1 gaze tracking infrastructure ---
  // Iris position samples collected during settle phase, used to compute baseline.
  const settleIrisSamplesRef = useRef<{ x: number; y: number }[]>([]);
  // Calibrated baseline iris position (median of settle samples). Null until computed.
  const irisBaselineRef = useRef<{ x: number; y: number } | null>(null);
  // Head pose samples collected during settle phase.
  const settleHeadSamplesRef = useRef<{ yaw: number; pitch: number; roll: number }[]>([]);
  // Calibrated baseline head pose.
  const headBaselineRef = useRef<{ yaw: number; pitch: number; roll: number } | null>(null);
  // Whether a blink occurred during the current 1-second tick window.
  const blinkInCurrentSecondRef = useRef(false);
  // Current unbroken held-gaze streak in seconds.
  const currentGazeStreakRef = useRef(0);
  // Longest unbroken gaze across the whole session in seconds.
  const longestGazeRef = useRef(0);
  // Total stillness seconds across the session.
  const totalStillnessRef = useRef(0);
  // Per-second 0/1 stability samples captured during gaze phases only.
  // Used to draw the within-session steadiness arc in History.
  const gazeSamplesRef = useRef<number[]>([]);
  // Count of seconds in gaze phases that contained a blink.
  const blinksDuringGazeRef = useRef(0);
  // Count of total seconds spent in gaze phases.
  const gazeSecondsRef = useRef(0);
  // For UI: expose current values to debug panel without forcing re-renders elsewhere.
  const [debugGazeStreak, setDebugGazeStreak] = useState(0);
  const [debugLongestGaze, setDebugLongestGaze] = useState(0);
  const [debugTotalStillness, setDebugTotalStillness] = useState(0);
  const [debugIrisBaselineSet, setDebugIrisBaselineSet] = useState(false);
  // Live iris position vs baseline — surfaced in debug panel to diagnose drift.
  const [debugIrisDrift, setDebugIrisDrift] = useState<{ dx: number; dy: number } | null>(null);
  const [debugIrisOk, setDebugIrisOk] = useState(true);
  // Live head pose vs baseline.
  const [debugHeadDrift, setDebugHeadDrift] = useState<{ dyaw: number; dpitch: number; droll: number } | null>(null);
  const [debugHeadOk, setDebugHeadOk] = useState(true);

  // Iris tolerance for "looking at diya" (fraction of normalised eye width).
  // Tightened from 0.12 → 0.08 so peripheral glances actually fail the check.
  // NOTE: this still won't catch head rotation — that requires head pose tracking
  // (planned for next phase). For now, assumes user keeps head still.
  const IRIS_TOLERANCE = 0.08;
  // Latest iris position from the most recent landmark frame (null if unavailable).
  const latestIrisRef = useRef<{ x: number; y: number } | null>(null);
  // Latest EAR (eye openness) from the most recent landmark frame.
  const latestEAROpenRef = useRef(0);
  // Latest head pose from the most recent landmark frame.
  const latestHeadRef = useRef<{ yaw: number; pitch: number; roll: number } | null>(null);
  // Head pose tolerance in radians (~8.6° per axis). Covers small natural settling
  // but catches actual head rotation to look at a screen corner.
  const HEAD_TOLERANCE_RAD = 0.15;

  // --- Pre-session baseline calibration ---
  // Samples collected while camera is on but session hasn't started yet.
  // Separate from settle samples so we can lock in baseline BEFORE the session.
  const preSessionIrisSamplesRef = useRef<{ x: number; y: number }[]>([]);
  const preSessionHeadSamplesRef = useRef<{ yaw: number; pitch: number; roll: number }[]>([]);
  // Status of the pre-session calibration shown to the user.
  // 'idle' = waiting for camera, 'calibrating' = collecting samples, 'ready' = baseline locked.
  const [baselineStatus, setBaselineStatus] = useState<"idle" | "calibrating" | "ready">("idle");
  // How many usable frames we've collected. Used for the progress display.
  const [baselineProgress, setBaselineProgress] = useState(0);
  // Threshold for "good enough" baseline — about 3 seconds at 30fps.
  const BASELINE_REQUIRED_FRAMES = 90;
  // Mirrors signalQuality state in a ref so the held-gaze tick can read it
  // without needing to be in the effect's dependency array.
  const signalQualityRef = useRef<SignalQuality>("poor");

  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(
    script[0]?.durationSec ?? 0
  );
  const [sessionComplete, setSessionComplete] = useState(false);
  const [saved, setSaved] = useState(false);
  // Free-form feedback note shown on summary screen (1000 char limit removed per user).
  const [note, setNote] = useState("");
  // Milestone IDs newly unlocked this session — computed when sessionComplete fires.
  const [pendingMilestones, setPendingMilestones] = useState<string[]>([]);
  const [settings] = useState<SessionSettings>(defaultSessionSettings);

  const [metrics, setMetrics] = useState<TrackingMetrics>({
    attentionScore: 84,
    blinkCount: 0,
    drift: 1.1,
    recoveryTime: 0.9,
    isDrifting: false,
  });
  const [attentionScore, setAttentionScore] = useState(84);
  const [avgDrift, setAvgDrift] = useState(1.1);
  const [avgRecovery, setAvgRecovery] = useState(0.9);

  useEffect(() => {
    lastValidAttentionScoreRef.current = attentionScore;
  }, [attentionScore]);

  // Keep signalQualityRef in sync so the held-gaze tick can read it
  // without subscribing to state.
  useEffect(() => {
    signalQualityRef.current = signalQuality;
  }, [signalQuality]);


  const isDebugMode = useMemo(
    () => new URLSearchParams(window.location.search).get("debug") === "true",
    []
  );

  const scrubToElapsed = useCallback(
    (targetElapsed: number) => {
      let acc = 0;
      for (let i = 0; i < script.length; i++) {
        const phase = script[i];
        if (acc + phase.durationSec >= targetElapsed || i === script.length - 1) {
          setPhaseIndex(i);
          setPhaseSecondsLeft(Math.max(1, Math.round(phase.durationSec - (targetElapsed - acc))));
          return;
        }
        acc += phase.durationSec;
      }
    },
    [script]
  );

  const currentPhase: SessionPhase | undefined = script[phaseIndex];

  const totalSecondsLeft = useMemo(() => {
    const remainingAfterCurrent = script
      .slice(phaseIndex + 1)
      .reduce((sum, phase) => sum + phase.durationSec, 0);

    return phaseSecondsLeft + remainingAfterCurrent;
  }, [phaseIndex, phaseSecondsLeft, script]);

  const elapsedSeconds = Math.max(0, totalDuration - totalSecondsLeft);
  const overallProgress = totalDuration === 0 ? 0 : elapsedSeconds / totalDuration;

  const isSettlePhase = currentPhase?.visualMode === "settle";
  const isGazePhase = currentPhase?.visualMode === "gaze";
  const isBodyPhase = currentPhase?.visualMode === "body";
  const isBreathPhase = currentPhase?.visualMode === "breath";
  const isEyesClosedPhase = currentPhase?.visualMode === "eyesClosed";
  const isIntegratePhase = currentPhase?.visualMode === "integrate";
  const showDiya = isGazePhase;
  // Pre-darken backdrop during the final breath phase so the diya appears on a
  // fully-black field without the rectangular flash from a still-fading backdrop.
  const isLastBreathPhase = currentPhase?.id === "breath-10-out";
  const wantsBlackBackdrop = showDiya || isEyesClosedPhase || isLastBreathPhase || isIntegratePhase;

  // Stops all media tracks safely when camera is disconnected/unmounted.
  const stopCameraStream = (stream: MediaStream | null) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
  };

  const disableCamera = () => {
    stopCameraStream(cameraStream);
    setCameraStream(null);
    setCameraState("idle");
    setCameraError("");
    setFaceStatus("idle");
    setFaceSnapshot(null);
    setEyeStatus("idle");
    setEyeSnapshot(null);
    blinkStateRef.current = "open";
    blinkStartTimeRef.current = null;
    lastBlinkAtRef.current = 0;
    lastFaceSeenAtRef.current = 0;
    lastValidEyeAtRef.current = 0;
    recentEyeValidityRef.current = [];
    lastValidAttentionScoreRef.current = 84;
    blinkEventTimesRef.current = [];
    closureDurationsRef.current = [];
    longClosureTimesRef.current = [];
    closureSampleStatesRef.current = [];
    setBlinkCountLive(0);
    setEyeOpennessHistory([]);
    setAttentionHistory([]);
    setBlinkRateHistory([]);
    setClosureBurdenHistory([]);
    setSignalQuality("poor");
    lastEyeTrendSampleAtRef.current = 0;
    lastDerivedTrendSampleAtRef.current = 0;
    // Reset pre-session baseline calibration — camera off means we need to recalibrate.
    preSessionIrisSamplesRef.current = [];
    preSessionHeadSamplesRef.current = [];
    irisBaselineRef.current = null;
    headBaselineRef.current = null;
    setBaselineStatus("idle");
    setBaselineProgress(0);
    setDebugIrisBaselineSet(false);
  };

  // Requests webcam access and stores stream state for preview/detection loops.
  const enableCamera = async () => {
    if (cameraStream) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setCameraError("Camera is not supported in this browser.");
      return;
    }

    try {
      setCameraState("requesting");
      setCameraError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
        },
        audio: false,
      });

      setCameraStream(stream);
      setCameraState("granted");
    } catch (error) {
      console.error("Camera access failed:", error);

      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setCameraState("denied");
        setCameraError("Camera permission was denied.");
        return;
      }

      if (error instanceof DOMException && error.name === "NotFoundError") {
        setCameraState("error");
        setCameraError("No camera was found.");
        return;
      }

      setCameraState("error");
      setCameraError("Unable to access camera.");
    }
  };
  // Blink event state machine with duration + debounce filtering.
  // Input: current eye state from landmarks. Output: increments blink counter on valid transitions.
  const processBlinkState = useCallback((eyeState: "open" | "closed") => {
    const now = performance.now();
    const previousState = blinkStateRef.current;

    if (eyeState === previousState) {
      return;
    }

    if (eyeState === "closed") {
      blinkStateRef.current = "closed";
      blinkStartTimeRef.current = now;
      return;
    }

    if (eyeState === "open" && previousState === "closed") {
      const blinkStart = blinkStartTimeRef.current;
      const closedDuration = blinkStart ? now - blinkStart : 0;
      const msSinceLastBlink = now - lastBlinkAtRef.current;

      blinkStateRef.current = "open";
      blinkStartTimeRef.current = null;

      const validDuration = closedDuration >= 40 && closedDuration <= 500;
      const debounced = msSinceLastBlink >= 120;

      if (validDuration && debounced) {
        lastBlinkAtRef.current = now;
        blinkEventTimesRef.current = [...blinkEventTimesRef.current, now].slice(-24);
        closureDurationsRef.current = [...closureDurationsRef.current, closedDuration].slice(-24);
        setBlinkCountLive((count) => count + 1);
        // Mark this 1-second tick as containing a blink — used by held-gaze logic.
        blinkInCurrentSecondRef.current = true;
        return;
      }

      const longClosure = closedDuration > 500 && closedDuration <= 4000;

      if (longClosure) {
        longClosureTimesRef.current = [...longClosureTimesRef.current, now].slice(-24);
        closureDurationsRef.current = [...closureDurationsRef.current, closedDuration].slice(-24);
      }
    }
  }, []);

  // Preload/cleanup audio assets once for this page lifecycle.
  useEffect(() => {
    const audioController = audioRef.current;
    audioController.preload();

    return () => {
      audioController.cleanup();
    };
  }, []);

  // Synchronizes ambient audio with phase changes while session runs.
  useEffect(() => {
    audioRef.current.syncPhase({
      phase: currentPhase,
      previousPhaseId: previousPhaseIdRef.current,
      isRunning,
      settings,
    });

    previousPhaseIdRef.current = currentPhase?.id;
  }, [currentPhase, isRunning, settings]);

  // Plays closing cue and returns viewport to top when session ends.
  useEffect(() => {
    if (!sessionComplete) return;
    audioRef.current.playClosingBell(settings);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [sessionComplete, settings]);

  useEffect(() => {
    if (!sessionComplete) return;
    disableCamera();

    // Compute newly-unlocked milestones for the summary screen.
    // We construct a provisional record with the session's gaze metrics
    // so the milestone tests can evaluate "what's true after tonight."
    const history = loadHistory();
    const provisional = {
      id: "pending",
      date: new Date().toISOString(),
      durationMin: Number((totalDuration / 60).toFixed(1)),
      attentionScore,
      feeling: "" as SessionFeeling,
      grade: "B" as const,
      longestGazeSec: longestGazeRef.current,
      totalStillnessSec: totalStillnessRef.current,
    };
    const unlocked = detectNewlyUnlocked(history, provisional);
    setPendingMilestones(unlocked);
  }, [sessionComplete]);



  // Core phase timer: advances script phases at 1-second cadence.
  useEffect(() => {
    if (!isRunning || !currentPhase) return;

    const interval = window.setInterval(() => {
      setPhaseSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        const nextIndex = phaseIndex + 1;
        if (nextIndex >= script.length) {
          window.clearInterval(interval);
          setIsRunning(false);
          setSessionComplete(true);
          return 0;
        }

        setPhaseIndex(nextIndex);
        return script[nextIndex].durationSec;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, phaseIndex, currentPhase, script]);

  // ---------------------------------------------------------------------------
  // Held-gaze tick — runs every 1s, only during gaze phases.
  // Determines whether this second qualifies as "held gaze" and updates
  // the streak / longest / total counters. Hidden from the user; surfaces
  // only in debug panels and the final session record.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isRunning || !isGazePhase) {
      // PAUSE the streak when leaving a gaze phase — do NOT reset.
      // Eyes-closed segments between gaze phases shouldn't break a streak;
      // only blinks, iris drift, or face loss during gaze should.
      // The streak resumes when the next gaze phase starts.
      blinkInCurrentSecondRef.current = false;
      return;
    }

    // Lazy-compute iris baseline on first gaze tick if we never set one.
    if (!irisBaselineRef.current) {
      const samples = settleIrisSamplesRef.current;
      if (samples.length >= 5) {
        const xs = samples.map((s) => s.x).sort((a, b) => a - b);
        const ys = samples.map((s) => s.y).sort((a, b) => a - b);
        const mid = Math.floor(samples.length / 2);
        irisBaselineRef.current = { x: xs[mid], y: ys[mid] };
      } else {
        // Fall back to centred assumption when we have too little baseline data.
        irisBaselineRef.current = { x: 0.5, y: 0.5 };
      }
      setDebugIrisBaselineSet(true);
    }

    // Lazy-compute head baseline on first gaze tick.
    if (!headBaselineRef.current) {
      const samples = settleHeadSamplesRef.current;
      if (samples.length >= 5) {
        const yaws = samples.map((s) => s.yaw).sort((a, b) => a - b);
        const pitches = samples.map((s) => s.pitch).sort((a, b) => a - b);
        const rolls = samples.map((s) => s.roll).sort((a, b) => a - b);
        const mid = Math.floor(samples.length / 2);
        headBaselineRef.current = {
          yaw: yaws[mid],
          pitch: pitches[mid],
          roll: rolls[mid],
        };
      } else {
        // No head pose data captured — fall back to "current position is baseline"
        // on first valid frame inside the tick below.
        headBaselineRef.current = null;
      }
    }

    const interval = window.setInterval(() => {
      // Pull current state from refs to avoid stale-closure issues.
      const facePresent =
        performance.now() - lastValidEyeAtRef.current < 1500;
      const eyesOpen = latestEAROpenRef.current > 0.18; // EAR threshold for "open"
      const noBlinkThisSecond = !blinkInCurrentSecondRef.current;
      const quality = signalQualityRef.current;
      const qualityOk = quality !== "poor";

      let irisOk = true; // assume ok if iris unavailable (graceful degradation)
      const iris = latestIrisRef.current;
      const baseline = irisBaselineRef.current;
      if (iris && baseline) {
        const dx = iris.x - baseline.x;
        const dy = iris.y - baseline.y;
        irisOk = Math.abs(dx) <= IRIS_TOLERANCE && Math.abs(dy) <= IRIS_TOLERANCE;
        setDebugIrisDrift({ dx, dy });
        setDebugIrisOk(irisOk);
      } else {
        setDebugIrisDrift(null);
        setDebugIrisOk(true);
      }

      // Head pose check — if user turns head to look at screen corner, this catches it.
      let headOk = true; // graceful degrade if head pose unavailable
      const head = latestHeadRef.current;
      // If we never got a settle baseline (no head pose during settle), lock in
      // the first valid gaze-phase frame as the baseline so we still get a reference.
      if (head && !headBaselineRef.current) {
        headBaselineRef.current = { yaw: head.yaw, pitch: head.pitch, roll: head.roll };
      }
      const headBase = headBaselineRef.current;
      if (head && headBase) {
        const dyaw = head.yaw - headBase.yaw;
        const dpitch = head.pitch - headBase.pitch;
        const droll = head.roll - headBase.roll;
        headOk =
          Math.abs(dyaw) <= HEAD_TOLERANCE_RAD &&
          Math.abs(dpitch) <= HEAD_TOLERANCE_RAD &&
          Math.abs(droll) <= HEAD_TOLERANCE_RAD;
        setDebugHeadDrift({ dyaw, dpitch, droll });
        setDebugHeadOk(headOk);
      } else {
        setDebugHeadDrift(null);
        setDebugHeadOk(true);
      }

      const heldGaze =
        facePresent && eyesOpen && noBlinkThisSecond && qualityOk && irisOk && headOk;

      // Capture per-second stability sample for the within-session arc.
      gazeSamplesRef.current.push(heldGaze ? 1 : 0);
      gazeSecondsRef.current += 1;
      if (blinkInCurrentSecondRef.current) {
        blinksDuringGazeRef.current += 1;
      }

      if (heldGaze) {
        currentGazeStreakRef.current += 1;
        totalStillnessRef.current += 1;
        if (currentGazeStreakRef.current > longestGazeRef.current) {
          longestGazeRef.current = currentGazeStreakRef.current;
        }
      } else {
        currentGazeStreakRef.current = 0;
      }

      setDebugGazeStreak(currentGazeStreakRef.current);
      setDebugLongestGaze(longestGazeRef.current);
      setDebugTotalStillness(totalStillnessRef.current);

      // Reset for next tick window.
      blinkInCurrentSecondRef.current = false;
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, isGazePhase]);

  useEffect(() => {
    attachStreamToVideo(sessionVideoRef.current, cameraStream);

    return () => {
      attachStreamToVideo(sessionVideoRef.current, null);
    };
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      stopCameraStream(cameraStream);
    };
  }, [cameraStream]);

  // Initializes face detector when camera stream becomes available.
  useEffect(() => {
    let cancelled = false;

    const initFaceDetector = async () => {
      if (!cameraStream) return;

      try {
        setFaceStatus("loading");
        await faceDetectorRef.current.init();

        if (!cancelled) {
          setFaceStatus("ready");
        }
      } catch (error) {
        console.error("Face detector init failed:", error);
        if (!cancelled) {
          setFaceStatus("error");
        }
      }
    };

    initFaceDetector();

    return () => {
      cancelled = true;
    };
  }, [cameraStream]);

  // Initializes landmark model used for eye openness and blink state.
  useEffect(() => {
    let cancelled = false;

    const initFaceLandmarker = async () => {
      if (!cameraStream) return;

      try {
        setEyeStatus("loading");
        await faceLandmarkerRef.current.init();

        if (!cancelled) {
          setEyeStatus("ready");
        }
      } catch (error) {
        console.error("Face landmarker init failed:", error);
        if (!cancelled) {
          setEyeStatus("error");
        }
      }
    };

    initFaceLandmarker();

    return () => {
      cancelled = true;
    };
  }, [cameraStream]);

  // Frame loop for face presence/centering status updates.
  useEffect(() => {
    if (!cameraStream) return;

    let frameId = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      const activeVideo = sessionVideoRef.current;

      if (activeVideo) {
        const snapshot = faceDetectorRef.current.detect(activeVideo);

        if (snapshot) {
          setFaceSnapshot(snapshot);

          if (!snapshot.facePresent) {
            setFaceStatus("no face");
          } else {
            lastFaceSeenAtRef.current = performance.now();

            if (snapshot.centered) {
              setFaceStatus("face centered");
            } else {
              setFaceStatus("face detected");
            }
          }
        }
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [cameraStream]);
  // Frame loop for eye landmarks, blink state updates, and eye-trend sampling.
  useEffect(() => {
    if (!cameraStream) return;

    let frameId = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      const activeVideo = sessionVideoRef.current;

      if (activeVideo) {
        const snapshot = faceLandmarkerRef.current.detect(activeVideo);

        if (snapshot) {
          setEyeSnapshot(snapshot);

          const opennessIsValid =
            snapshot.facePresent && isPlausibleEyeOpenness(snapshot.eyeOpenAvg);

          recentEyeValidityRef.current.push(opennessIsValid);
          if (recentEyeValidityRef.current.length > 24) {
            recentEyeValidityRef.current = recentEyeValidityRef.current.slice(-24);
          }

          if (!snapshot.facePresent) {
            blinkStateRef.current = "open";
            blinkStartTimeRef.current = null;
            setEyeStatus("no landmarks");
          } else {
            lastValidEyeAtRef.current = performance.now();
            processBlinkState(snapshot.eyeState);

            // --- Phase 1 gaze tracking ---
            // Collect iris + head pose samples during settle phase for baseline calibration.
            if (isRunning && currentPhase?.visualMode === "settle") {
              if (snapshot.irisAvailable) {
                settleIrisSamplesRef.current.push({
                  x: snapshot.irisX,
                  y: snapshot.irisY,
                });
                if (settleIrisSamplesRef.current.length > 600) {
                  settleIrisSamplesRef.current = settleIrisSamplesRef.current.slice(-600);
                }
              }
              if (snapshot.headPoseAvailable) {
                settleHeadSamplesRef.current.push({
                  yaw: snapshot.headYaw,
                  pitch: snapshot.headPitch,
                  roll: snapshot.headRoll,
                });
                if (settleHeadSamplesRef.current.length > 600) {
                  settleHeadSamplesRef.current = settleHeadSamplesRef.current.slice(-600);
                }
              }
            }

            // Stash latest snapshot for the per-second held-gaze tick.
            latestIrisRef.current = snapshot.irisAvailable
              ? { x: snapshot.irisX, y: snapshot.irisY }
              : null;
            latestEAROpenRef.current = snapshot.earAvg;
            latestHeadRef.current = snapshot.headPoseAvailable
              ? { yaw: snapshot.headYaw, pitch: snapshot.headPitch, roll: snapshot.headRoll }
              : null;

            // --- Pre-session baseline calibration ---
            // While camera is on but session hasn't started, accumulate clean
            // iris + head samples so the user can see a "Ready" indicator
            // before they click Start Session.
            if (
              !isRunning &&
              !irisBaselineRef.current &&
              snapshot.irisAvailable &&
              snapshot.headPoseAvailable
            ) {
              preSessionIrisSamplesRef.current.push({
                x: snapshot.irisX,
                y: snapshot.irisY,
              });
              preSessionHeadSamplesRef.current.push({
                yaw: snapshot.headYaw,
                pitch: snapshot.headPitch,
                roll: snapshot.headRoll,
              });

              const count = preSessionIrisSamplesRef.current.length;
              setBaselineProgress(Math.min(count, BASELINE_REQUIRED_FRAMES));

              if (count < BASELINE_REQUIRED_FRAMES) {
                setBaselineStatus("calibrating");
              } else if (!irisBaselineRef.current) {
                // Lock in baseline from collected samples (median for robustness).
                const irisSamples = preSessionIrisSamplesRef.current;
                const headSamples = preSessionHeadSamplesRef.current;

                const ix = irisSamples.map((s) => s.x).sort((a, b) => a - b);
                const iy = irisSamples.map((s) => s.y).sort((a, b) => a - b);
                const hy = headSamples.map((s) => s.yaw).sort((a, b) => a - b);
                const hp = headSamples.map((s) => s.pitch).sort((a, b) => a - b);
                const hr = headSamples.map((s) => s.roll).sort((a, b) => a - b);
                const mid = Math.floor(irisSamples.length / 2);

                irisBaselineRef.current = { x: ix[mid], y: iy[mid] };
                headBaselineRef.current = {
                  yaw: hy[mid],
                  pitch: hp[mid],
                  roll: hr[mid],
                };
                setDebugIrisBaselineSet(true);
                setBaselineStatus("ready");
              }
            }

            const now = performance.now();
            if (now - lastEyeTrendSampleAtRef.current >= 120) {
              lastEyeTrendSampleAtRef.current = now;

              if (opennessIsValid) {
                setEyeOpennessHistory((prev) => {
                  const next = [...prev, snapshot.eyeOpenAvg];
                  return next.slice(-60);
                });

                const closedNow = snapshot.eyeOpenAvg < 0.0105;
                closureSampleStatesRef.current = [
                  ...closureSampleStatesRef.current,
                  closedNow,
                ].slice(-120);
              }
            }

            if (!opennessIsValid) {
              setEyeStatus("signal noisy");
            } else if (snapshot.blinkLikely) {
              setEyeStatus("blink");
            } else {
              setEyeStatus("eyes detected");
            }
          }
        }
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [cameraStream]);


  useEffect(() => {
    if (!cameraStream) {
      setSignalQuality("poor");
      return;
    }

    const interval = window.setInterval(() => {
      const now = performance.now();
      const faceRecent = now - lastFaceSeenAtRef.current <= 1000;
      const eyeRecent = now - lastValidEyeAtRef.current <= 800;
      const samples = recentEyeValidityRef.current;
      const validCount = samples.filter(Boolean).length;
      const totalCount = samples.length || 1;
      const validRatio = validCount / totalCount;
      const missedRatio = 1 - validRatio;

      const recentValidOpennessValues = eyeOpennessHistory
        .slice(-8)
        .filter((value) => isPlausibleEyeOpenness(value));

      const opennessRecentValid = recentValidOpennessValues.length >= 3;

      setSignalQuality(
        deriveSignalQuality({
          faceRecent,
          eyeRecent,
          validRatio,
          missedRatio,
          opennessRecentValid,
        })
      );
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [cameraStream, eyeOpennessHistory]);
  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      const now = performance.now();

      const recentBlinkTimes = blinkEventTimesRef.current.filter(
        (time) => now - time <= 20000
      );
      blinkEventTimesRef.current = blinkEventTimesRef.current.filter(
        (time) => now - time <= 120000
      );

      longClosureTimesRef.current = longClosureTimesRef.current.filter(
        (time) => now - time <= 120000
      );

      const recentClosureSamples = closureSampleStatesRef.current.slice(-120);
      const closedSampleCount = recentClosureSamples.filter(Boolean).length;
      const closureBurden =
        recentClosureSamples.length === 0
          ? 0
          : (closedSampleCount / recentClosureSamples.length) * 100;

      const blinkRatePerMinuteWindow = recentBlinkTimes.length * 3;

      setBlinkRateHistory((prev) => {
        const next = [...prev, blinkRatePerMinuteWindow];
        return next.slice(-60);
      });

      setClosureBurdenHistory((prev) => {
        const next = [...prev, Number(closureBurden.toFixed(1))];
        return next.slice(-60);
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isRunning]);
  useEffect(() => {
    return () => {
      faceDetectorRef.current.close();
    };
  }, []);

  useEffect(() => {
    return () => {
      faceLandmarkerRef.current.close();
    };
  }, []);


  const handleStart = async () => {
    if (sessionComplete) return;

    setSaved(false);

    // Reset per-session counters at session start.
    // NOTE: we deliberately do NOT clear iris/head baselines here — if
    // pre-session calibration already locked them in, we want to keep them.
    // They'll only be re-derived (from settle) if calibration didn't complete.
    settleIrisSamplesRef.current = [];
    settleHeadSamplesRef.current = [];
    blinkInCurrentSecondRef.current = false;
    currentGazeStreakRef.current = 0;
    longestGazeRef.current = 0;
    totalStillnessRef.current = 0;
    gazeSamplesRef.current = [];
    blinksDuringGazeRef.current = 0;
    gazeSecondsRef.current = 0;
    setDebugGazeStreak(0);
    setDebugLongestGaze(0);
    setDebugTotalStillness(0);
    setDebugIrisDrift(null);
    setDebugHeadDrift(null);
    setDebugIrisOk(true);
    setDebugHeadOk(true);
    // If pre-session baseline is set, debug flag stays true; otherwise it
    // will flip true once settle calibration completes.
    setDebugIrisBaselineSet(irisBaselineRef.current !== null);
    // Clear summary-screen state from any previous session.
    setNote("");
    setPendingMilestones([]);

    if (!cameraStream) {
      await enableCamera();
    }

    setIsRunning(true);
    await audioRef.current.playSoftTransitionCue(settings);
  };

  const handleSaveSession = () => {
    if (saved) return;

    const trimmedNote = note.trim();
    const record = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      durationMin: Number((totalDuration / 60).toFixed(1)),
      attentionScore,
      feeling: "" as SessionFeeling,
      grade: (attentionScore >= 85 ? "A" : attentionScore >= 72 ? "B" : "C") as "A" | "B" | "C",
      blinkCount: metrics.blinkCount,
      avgDrift,
      avgRecovery,
      longestGazeSec: longestGazeRef.current,
      totalStillnessSec: totalStillnessRef.current,
      blinkRateDuringGaze:
        gazeSecondsRef.current > 0
          ? Number(((blinksDuringGazeRef.current / gazeSecondsRef.current) * 60).toFixed(1))
          : undefined,
      gazeStabilitySamples:
        gazeSamplesRef.current.length > 0 ? [...gazeSamplesRef.current] : undefined,
      note: trimmedNote.length > 0 ? trimmedNote : undefined,
      newMilestones: pendingMilestones.length > 0 ? pendingMilestones : undefined,
    };

    saveSession(record);           // local cache — instant
    void saveSessionRemote(record); // Supabase — fire and forget

    setSaved(true);
    navigate("/");
  };

  const togglePanel = (key: keyof PanelState) => {
    setPanelsOpen((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const bodyCue = isBodyPhase ? getBodyCue(phaseSecondsLeft) : "";
  const bodyRegionLabel =
    isBodyPhase && currentPhase?.bodyRegion
      ? BODY_REGION_LABELS[currentPhase.bodyRegion]
      : "";

  const primaryInstruction = sessionComplete
    ? ""
    : isBodyPhase || isGazePhase || isEyesClosedPhase || isIntegratePhase
    ? ""
    : isBreathPhase
    ? (currentPhase?.breathAction === "inhale" ? "Inhale" : "Exhale")
    : currentPhase?.instruction ?? "";

  // Longer cross-fade on the body cue so CLENCH<->RELEASE feels deliberate.
  const { displayed: shownBodyCue, opacity: bodyCueOpacity } = useCrossFadeText(bodyCue, 700);
  const { displayed: shownBodyRegionLabel, opacity: bodyRegionLabelOpacity } = useCrossFadeText(bodyRegionLabel);
  // Smoothly swap Inhale<->Exhale (FadeWrapper alone stays active across breath
  // phases so the text would otherwise hard-cut).
  const { displayed: shownPrimaryInstruction, opacity: primaryInstructionOpacity } =
    useCrossFadeText(primaryInstruction, 450);

  const liveBlinkRatePerMinute = useMemo(() => {
    if (blinkRateHistory.length === 0) return 0;
    return blinkRateHistory[blinkRateHistory.length - 1];
  }, [blinkRateHistory]);

  const closureBurdenPercent = useMemo(() => {
    if (closureBurdenHistory.length === 0) return 0;
    return closureBurdenHistory[closureBurdenHistory.length - 1];
  }, [closureBurdenHistory]);

  const recentLongClosures = useMemo(() => {
    const now = performance.now();
    return longClosureTimesRef.current.filter((time) => now - time <= 30000).length;
  }, [closureBurdenHistory]);

  const validSignalCoveragePercent = useMemo(() => {
    const samples = recentEyeValidityRef.current;
    if (samples.length === 0) return 0;
    return (samples.filter(Boolean).length / samples.length) * 100;
  }, [eyeSnapshot, signalQuality]);

  const recentEyeOpennessWindow = useMemo(() => {
    return eyeOpennessHistory.slice(-20);
  }, [eyeOpennessHistory]);

  const eyeOpennessStd = useMemo(() => {
    return standardDeviation(recentEyeOpennessWindow);
  }, [recentEyeOpennessWindow]);

  const rawAttentionEstimate = useMemo(() => {
    const blinkPenalty = clamp(Math.max(0, liveBlinkRatePerMinute - 6) * 2.4, 0, 24);
    const closurePenalty = clamp(closureBurdenPercent * 1.35, 0, 34);
    const variabilityPenalty = clamp(eyeOpennessStd * 4200, 0, 18);
    const longClosurePenalty = clamp(recentLongClosures * 7, 0, 21);
    const coveragePenalty = clamp((100 - validSignalCoveragePercent) * 0.25, 0, 20);
    const qualityPenalty =
      signalQuality === "good" ? 0 : signalQuality === "fair" ? 6 : 12;

    return clamp(
      100 -
        blinkPenalty -
        closurePenalty -
        variabilityPenalty -
        longClosurePenalty -
        coveragePenalty -
        qualityPenalty,
      0,
      100
    );
  }, [
    liveBlinkRatePerMinute,
    closureBurdenPercent,
    eyeOpennessStd,
    recentLongClosures,
    validSignalCoveragePercent,
    signalQuality,
  ]);

  const liveEyeOpenness = eyeSnapshot?.facePresent ? eyeSnapshot.eyeOpenAvg : null;

  // Live heuristic attention estimate during gaze phases.
  useEffect(() => {
    if (!isRunning || !isGazePhase) {
      return;
    }

    const interval = window.setInterval(() => {
      if (recentEyeOpennessWindow.length < 6) {
        return;
      }

      if (signalQuality === "poor") {
        return;
      }

      setAttentionScore((previous) => {
        const blendWeight = signalQuality === "fair" ? 0.2 : 0.36;
        const nextDisplayed = Math.round(
          clamp(previous * (1 - blendWeight) + rawAttentionEstimate * blendWeight, 0, 100)
        );

        setAttentionHistory((prev) => {
          const next = [...prev, nextDisplayed];
          return next.slice(-60);
        });

        return nextDisplayed;
      });

      setMetrics((previous) => ({
        ...previous,
        attentionScore: Math.round(rawAttentionEstimate),
        blinkCount: blinkCountLive,
      }));

      setAvgDrift(Number((closureBurdenPercent / 100).toFixed(2)));
      setAvgRecovery(
        Number((Math.max(0, 100 - validSignalCoveragePercent) / 100).toFixed(2))
      );
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    isRunning,
    isGazePhase,
    rawAttentionEstimate,
    signalQuality,
    blinkCountLive,
    closureBurdenPercent,
    validSignalCoveragePercent,
    recentEyeOpennessWindow,
    liveBlinkRatePerMinute,
  ]);


  return (
    <MeditationBackground >
      {/* Black backdrop for gaze phase — makes screen-blend on the diya
          video work perfectly (screen with black = pass-through). */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#000",
          opacity: wantsBlackBackdrop ? 1 : 0,
          transition: "opacity 1.4s ease-in-out",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        className="page-shell mobile-stack"
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          justifyContent: sessionComplete ? "flex-start" : "center",
          alignItems: "center",
          padding: "20px 20px 32px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        {sessionComplete ? (
          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "56px 28px 48px",
              margin: "0 auto",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "36px",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              color: "rgba(245, 233, 218, 0.85)",
            }}
          >
            {/* Hero stat */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(245, 233, 218, 0.38)",
                }}
              >
                Longest gaze
              </div>
              {/* Number and unit on one line, modest size so digits stay legible */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <div
                  style={{
                    fontSize: "clamp(52px, 11vw, 80px)",
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontWeight: 400,
                    color: "rgba(245, 233, 218, 0.95)",
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {longestGazeRef.current}
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontFamily: '"DM Sans", system-ui, sans-serif',
                    fontWeight: 300,
                    color: "rgba(245, 233, 218, 0.45)",
                    lineHeight: 1,
                  }}
                >
                  sec
                </div>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "rgba(245, 233, 218, 0.38)",
                  letterSpacing: "0.01em",
                }}
              >
                {(() => {
                  const allHistory = [...loadHistory()];
                  const sessionN = allHistory.length + 1;
                  const totalMin = Math.round(
                    (allHistory.reduce((s, r) => s + (r.totalStillnessSec ?? 0), 0) + totalStillnessRef.current) / 60
                  );
                  const bestEver = Math.max(
                    longestGazeRef.current,
                    ...allHistory.map((r) => r.longestGazeSec ?? 0)
                  );
                  return `Session ${sessionN} · ${totalMin}m total · ${bestEver}s best`;
                })()}
              </div>
            </div>

            {/* Milestones */}
            {pendingMilestones.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                {pendingMilestones.map((id) => (
                  <div
                    key={id}
                    style={{
                      fontSize: "13px",
                      color: "rgba(255, 179, 71, 0.82)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    ★ {milestoneLabel(id)}
                  </div>
                ))}
              </div>
            )}

            {/* Feedback — no heading, textarea speaks for itself */}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Notes or feedback (optional)"
              style={{
                width: "100%",
                padding: "10px 0",
                border: "none",
                borderBottom: "1px solid rgba(245, 233, 218, 0.10)",
                background: "transparent",
                color: "rgba(245, 233, 218, 0.88)",
                fontSize: "14px",
                lineHeight: 1.65,
                fontFamily: "inherit",
                resize: "none",
                outline: "none",
                textAlign: "center",
              }}
              onFocus={(e) => (e.currentTarget.style.borderBottomColor = "rgba(255,179,71,0.35)")}
              onBlur={(e) => (e.currentTarget.style.borderBottomColor = "rgba(245, 233, 218, 0.10)")}
            />

            <button
              onClick={handleSaveSession}
              disabled={saved}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 179, 71, 0.32)",
                color: "rgba(255, 179, 71, 0.88)",
                padding: "11px 36px",
                borderRadius: "999px",
                fontSize: "12px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontFamily: "inherit",
                cursor: saved ? "default" : "pointer",
                opacity: saved ? 0.45 : 1,
                transition: "background 0.2s, border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!saved) {
                  e.currentTarget.style.background = "rgba(255, 179, 71, 0.07)";
                  e.currentTarget.style.borderColor = "rgba(255, 179, 71, 0.55)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(255, 179, 71, 0.32)";
              }}
            >
              {saved ? "Saved" : "Finish"}
            </button>
          </div>
        ) : (
          <>
            {((!isRunning && (cameraStream || cameraState === "requesting")) || (isRunning && isDebugMode)) && (
              <div
                style={{
                  position: "fixed",
                  top: "calc(18px + env(safe-area-inset-top))",
                  right: "calc(18px + env(safe-area-inset-right))",
                  width: "clamp(120px, 26vw, 220px)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  background: "rgba(0,0,0,0.28)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
                  zIndex: 40,
                  backdropFilter: "blur(8px)",
                }}
              >
                <video
                  ref={sessionVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: "100%",
                    display: "block",
                    transform: "scaleX(-1)",
                    background: "#111",
                  }}
                />

                <div
                  style={{
                    padding: "8px 10px",
                    fontSize: "12px",
                    color: "#F5E9DA",
                    textAlign: "left",
                    lineHeight: 1.45,
                  }}
                >
                  <div>
                    Camera: {cameraState}
                    {cameraError ? ` - ${cameraError}` : ""}
                  </div>
                  <div>Face: {faceStatus}</div>
                  {faceSnapshot?.facePresent && (
                    <div>
                      Confidence: {Math.round(faceSnapshot.confidence * 100)}%
                      {faceSnapshot.centered ? " • centered" : " • adjust position"}
                    </div>
                  )}
                  <div>Eyes: {eyeStatus}</div>
                  {eyeSnapshot?.facePresent && (
                    <>
                      <div>
                        Eye openness: {eyeSnapshot.eyeOpenAvg.toFixed(4)}
                        {eyeSnapshot.blinkLikely ? " • blink likely" : ""}
                      </div>
                      <div>Blinks: {blinkCountLive}</div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div
              style={{
                width: "100%",
                maxWidth: "760px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                minHeight: "78vh",
                justifyContent: "space-between",
                gap: "18px",
                paddingTop: "8px",
              }}
            >
              {/* Centered visual + text group */}
              <div
                style={{
                  flex: 1,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: isBodyPhase || isSettlePhase || isIntegratePhase ? "flex-start" : "center",
                  paddingTop: isBodyPhase ? "clamp(12px, 2vh, 28px)" : isSettlePhase || isIntegratePhase ? "clamp(36px, 8vh, 72px)" : 0,
                  gap: "12px",
                }}
              >
                {/* Body cue: proper flex sibling ABOVE the figure container so
                    it can never overlap the SVG regardless of viewport size. */}
                <FadeWrapper active={isBodyPhase}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "clamp(28px, 6vh, 56px)",
                    }}
                  >
                    {/* Primary cue — CLENCH / RELEASE is the action focus. */}
                    <div
                      style={{
                        fontSize: "clamp(34px, 4.4vw, 46px)",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "rgba(245, 233, 218, 0.88)",
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontWeight: 400,
                        lineHeight: 1.1,
                        opacity: bodyCueOpacity,
                        transition: "opacity 0.7s ease",
                      }}
                    >
                      {shownBodyCue}
                    </div>
                    {/* Secondary cue — which body region. */}
                    <div
                      style={{
                        fontSize: "15px",
                        letterSpacing: "0.04em",
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontWeight: 400,
                        fontStyle: "italic",
                        color: "rgba(203, 183, 158, 0.65)",
                        lineHeight: 1.2,
                        opacity: bodyRegionLabelOpacity,
                        transition: "opacity 0.45s ease",
                      }}
                    >
                      {shownBodyRegionLabel}
                    </div>
                  </div>
                </FadeWrapper>

                {/* Phase label — tiny tracked caps, orients the user in the arc.
                    Hidden during body (cue text already conveys it), gaze, and
                    eyes-closed (trataka stays visually silent). */}
                <FadeWrapper
                  active={
                    !isBodyPhase &&
                    !isGazePhase &&
                    !isEyesClosedPhase &&
                    !!currentPhase?.label &&
                    !sessionComplete
                  }
                >
                  <div
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.28em",
                      textTransform: "uppercase",
                      color: "rgba(203, 183, 158, 0.42)",
                      fontFamily: '"Playfair Display", Georgia, serif',
                      marginBottom: "10px",
                    }}
                  >
                    {currentPhase?.label}
                  </div>
                </FadeWrapper>

                <FadeWrapper active={!isBodyPhase && !!primaryInstruction}>
                  <div
                    style={{
                      fontSize: isBreathPhase ? "clamp(26px, 3vw, 34px)" : "22px",
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontWeight: isBreathPhase ? 300 : 400,
                      color: "rgba(245, 233, 218, 0.78)",
                      lineHeight: 1.5,
                      letterSpacing: isBreathPhase ? "0.05em" : "0.01em",
                      maxWidth: "32ch",
                      textAlign: "center",
                      opacity: primaryInstructionOpacity,
                      transition: "font-size 0.6s ease, opacity 0.45s ease",
                      marginBottom: isBreathPhase ? "clamp(28px, 7vh, 64px)" : undefined,
                    }}
                  >
                    {shownPrimaryInstruction}
                  </div>
                </FadeWrapper>

                {/* Visual container — all layers stack absolutely at center via FadeWrappers
                    so cross-fades never push elements off-axis or overlap horizontally. */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    maxWidth: "760px",
                    // One stable minHeight across all non-settle phases so the
                    // container doesn't resize during cross-fades.
                    minHeight: isSettlePhase
                      ? "clamp(180px, 30vh, 260px)"
                      : "clamp(360px, 56vh, 460px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FadeWrapper
                    active={showDiya || isEyesClosedPhase}
                    durationMs={700}
                    style={ABSOLUTE_CENTER_LAYER}
                  >
                    <div
                      style={{
                        position: "relative",
                        mixBlendMode: "screen",
                        opacity: showDiya ? 1 : 0,
                        transition: "opacity 0.8s ease-in-out",
                        lineHeight: 0,
                      }}
                    >
                      {/* Slow drifting warmth — keeps long gaze holds feeling alive
                          without competing with the flame. Sits behind the video. */}
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          width: "180%",
                          height: "180%",
                          borderRadius: "50%",
                          background:
                            "radial-gradient(circle, rgba(255,170,80,0.35) 0%, rgba(220,120,50,0.12) 35%, transparent 65%)",
                          filter: "blur(40px)",
                          pointerEvents: "none",
                          animation: "gazeAmbientDrift 22s ease-in-out infinite",
                        }}
                      />
                      <video
                        src="/diya-session.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                          width: "clamp(240px, 38vw, 360px)",
                          filter: "brightness(0.88) contrast(1.6)",
                          pointerEvents: "none",
                          display: "block",
                        }}
                      />
                    </div>
                  </FadeWrapper>

                  <FadeWrapper
                    active={isBodyPhase}
                    style={{
                      ...ABSOLUTE_CENTER_LAYER,
                      WebkitMaskImage:
                        "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
                      maskImage:
                        "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
                    }}
                  >
                    <BodyGuideOverlay
                      activeRegion={currentPhase?.bodyRegion ?? "feet"}
                      phaseSecondsLeft={phaseSecondsLeft}
                    />
                  </FadeWrapper>

                  <FadeWrapper active={isBreathPhase} style={ABSOLUTE_CENTER_LAYER}>
                    <BreathGuide
                      action={currentPhase?.breathAction ?? "exhale"}
                      durationSec={currentPhase?.durationSec ?? 8}
                    />
                  </FadeWrapper>

                  <FadeWrapper active={isSettlePhase || isIntegratePhase} style={ABSOLUTE_CENTER_LAYER}>
                    <SettleHalo />
                  </FadeWrapper>

                  <FadeWrapper
                    active={isEyesClosedPhase || isIntegratePhase}
                    durationMs={1500}
                    style={ABSOLUTE_CENTER_LAYER}
                  >
                    <BrushstrokeEyes />
                  </FadeWrapper>
                </div>
              </div>{/* end centered group */}

              {isDebugMode && (
                <CollapsibleCard
                  title="Trend Graphs"
                  open={panelsOpen.graphs}
                  onToggle={() => togglePanel("graphs")}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    <TrendCard
                      title="Eye openness trend"
                      values={eyeOpennessHistory}
                      currentLabel={
                        liveEyeOpenness !== null ? `Current: ${liveEyeOpenness.toFixed(4)}` : "Current: —"
                      }
                      minLabel="0.000"
                      maxLabel="0.035"
                      minValue={0}
                      maxValue={0.035}
                    />

                    <TrendCard
                      title="Attention estimate trend"
                      values={attentionHistory}
                      currentLabel={`Current: ${attentionScore}`}
                      minLabel="0"
                      maxLabel="100"
                      minValue={0}
                      maxValue={100}
                      stroke="rgba(186, 216, 238, 0.9)"
                    />

                    <TrendCard
                      title="Blink rate trend"
                      values={blinkRateHistory}
                      currentLabel={`Current: ${liveBlinkRatePerMinute.toFixed(1)} / min`}
                      minLabel="0"
                      maxLabel="30"
                      minValue={0}
                      maxValue={30}
                      stroke="rgba(244, 196, 135, 0.92)"
                    />

                    <TrendCard
                      title="Closure burden trend"
                      values={closureBurdenHistory}
                      currentLabel={`Current: ${closureBurdenPercent.toFixed(1)}%`}
                      minLabel="0%"
                      maxLabel="100%"
                      minValue={0}
                      maxValue={100}
                      stroke="rgba(198, 214, 173, 0.92)"
                    />
                  </div>
                </CollapsibleCard>
              )}

              {!isRunning && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
                  {/* Baseline calibration status — gives the user confidence
                      that face/iris/head tracking is set up before starting. */}
                  {cameraStream && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: "13px",
                        fontFamily: '"Playfair Display", Georgia, serif',
                        color:
                          baselineStatus === "ready"
                            ? "rgba(180, 220, 160, 0.85)"
                            : baselineStatus === "calibrating"
                            ? "rgba(245, 233, 218, 0.6)"
                            : "rgba(245, 233, 218, 0.4)",
                      }}
                    >
                      <span style={{ fontSize: "16px" }}>
                        {baselineStatus === "ready" ? "✓" : baselineStatus === "calibrating" ? "◐" : "○"}
                      </span>
                      <span>
                        {baselineStatus === "ready"
                          ? "Ready to begin"
                          : baselineStatus === "calibrating"
                          ? `Calibrating… ${Math.round((baselineProgress / BASELINE_REQUIRED_FRAMES) * 100)}%`
                          : "Waiting for face"}
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      flexWrap: "wrap",
                      justifyContent: "center",
                    }}
                  >
                    <button className="primary-button" onClick={handleStart}>
                      Start Session
                    </button>

                    {cameraStream && (
                      <button className="secondary-button" onClick={disableCamera}>
                        Disconnect Camera
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                width: "100%",
                maxWidth: "760px",
                paddingTop: "10px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "2px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.max(0.02, overallProgress) * 100}%`,
                    height: "100%",
                    borderRadius: "inherit",
                    background:
                      "linear-gradient(90deg, rgba(240,168,86,0.85), rgba(255,226,183,0.85))",
                    transition: isRunning ? "width 1s linear" : "width 0.35s ease",
                    boxShadow: "0 0 8px rgba(255,179,71,0.35)",
                  }}
                />
              </div>

              {/* Debug scrubber — only visible at ?debug=true */}
              {isDebugMode && (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.35)", marginBottom: "4px", fontFamily: "monospace" }}>
                    <span>{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}</span>
                    <span style={{ color: "rgba(255,179,71,0.6)" }}>{currentPhase?.visualMode ?? "—"}</span>
                    <span>{Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, "0")}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={totalDuration}
                    value={elapsedSeconds}
                    onChange={(e) => scrubToElapsed(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#ffb347", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace", marginTop: "2px", position: "relative", height: "14px" }}>
                    {(() => {
                      let acc = 0;
                      return script.map((phase, i) => {
                        const left = (acc / totalDuration) * 100;
                        acc += phase.durationSec;
                        return (
                          <span key={i} style={{ position: "absolute", left: `${left}%`, transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                            |
                          </span>
                        );
                      });
                    })()}
                  </div>
                  {/* Gaze tracking debug stats */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,179,71,0.7)", marginTop: "8px", fontFamily: "monospace" }}>
                    <span>streak: {debugGazeStreak}s</span>
                    <span>longest: {debugLongestGaze}s</span>
                    <span>stillness: {debugTotalStillness}s</span>
                    <span style={{ color: debugIrisBaselineSet ? "rgba(180,220,160,0.7)" : "rgba(255,255,255,0.3)" }}>
                      baseline: {debugIrisBaselineSet ? "set" : "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: debugIrisOk ? "rgba(180,220,160,0.6)" : "rgba(255,140,140,0.85)", marginTop: "2px", fontFamily: "monospace" }}>
                    <span>
                      iris: {debugIrisDrift
                        ? `dx=${debugIrisDrift.dx >= 0 ? "+" : ""}${debugIrisDrift.dx.toFixed(3)}  dy=${debugIrisDrift.dy >= 0 ? "+" : ""}${debugIrisDrift.dy.toFixed(3)}`
                        : "—"}
                    </span>
                    <span>tol: ±{IRIS_TOLERANCE.toFixed(3)}</span>
                    <span>{debugIrisOk ? "ok" : "DRIFT"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: debugHeadOk ? "rgba(180,220,160,0.6)" : "rgba(255,140,140,0.85)", marginTop: "2px", fontFamily: "monospace" }}>
                    <span>
                      head: {debugHeadDrift
                        ? `yaw=${(debugHeadDrift.dyaw * 180 / Math.PI).toFixed(1)}° pitch=${(debugHeadDrift.dpitch * 180 / Math.PI).toFixed(1)}° roll=${(debugHeadDrift.droll * 180 / Math.PI).toFixed(1)}°`
                        : "—"}
                    </span>
                    <span>tol: ±{(HEAD_TOLERANCE_RAD * 180 / Math.PI).toFixed(1)}°</span>
                    <span>{debugHeadOk ? "ok" : "ROT"}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MeditationBackground>
  );
}
































