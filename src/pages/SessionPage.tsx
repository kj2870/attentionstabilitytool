import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  loadRoutineSelection,
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
import { RESEARCH_MODE } from "../lib/presentationMode";

// Maps body-region IDs from the session script to user-facing labels.
const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  feet: "Feet",
  calves: "Calves",
  thighs: "Thighs",
  pelvis: "Pelvis + abs",
  backShoulders: "Back + shoulders",
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

function formatTimestampForKey(date: Date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function csvEscape(value: string | number) {
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function buildPilotCsvRow(record: PilotSummaryRecord) {
  const headers = [
    "session_id",
    "user_id",
    "timestamp_iso",
    "timestamp_label",
    "protocol_version",
    "total_duration_sec",
    "attention_estimate_final",
    "attention_estimate_avg",
    "blink_rate_avg",
    "closure_burden_avg",
    "valid_signal_coverage_avg",
    "long_closures_total",
    "signal_quality_end",
    "focus_rating",
    "calm_rating",
    "eye_strain_rating",
    "difficulty_rating",
    "notes",
  ];

  const values = [
    record.sessionId,
    record.userId,
    record.timestampIso,
    record.timestampLabel,
    record.protocolVersion,
    record.totalDurationSec,
    record.attentionEstimateFinal,
    record.attentionEstimateAvg,
    record.blinkRateAvg,
    record.closureBurdenAvg,
    record.validSignalCoverageAvg,
    record.longClosuresTotal,
    record.signalQualityEnd,
    record.focusRating,
    record.calmRating,
    record.eyeStrainRating,
    record.difficultyRating,
    record.notes,
  ];

  return {
    header: headers.join(","),
    row: values.map(csvEscape).join(","),
  };
}

function appendCsvWithHeader(existingCsv: string, header: string, row: string) {
  if (!existingCsv.trim()) {
    return `${header}\n${row}`;
  }
  return `${existingCsv}\n${row}`;
}

function readResearchUserId() {
  const candidates = [
    localStorage.getItem("focusflow_user_id"),
    localStorage.getItem("focusflowUserId"),
    localStorage.getItem("userId"),
    localStorage.getItem("participantId"),
  ].filter(Boolean) as string[];

  return candidates[0] ?? "research-user";
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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
type ResearchStep = "setup" | "camera" | "session" | "survey" | "summary";

type PanelState = {
  measurement: boolean;
  protocol: boolean;
  liveSignals: boolean;
  graphs: boolean;
};

type PilotSurveyState = {
  focus: number;
  calm: number;
  eyeStrain: number;
  difficulty: number;
  notes: string;
};

type PilotSummaryRecord = {
  sessionId: string;
  userId: string;
  timestampIso: string;
  timestampLabel: string;
  protocolVersion: string;
  totalDurationSec: number;
  attentionEstimateFinal: number;
  attentionEstimateAvg: number;
  blinkRateAvg: number;
  closureBurdenAvg: number;
  validSignalCoverageAvg: number;
  longClosuresTotal: number;
  signalQualityEnd: SignalQuality;
  focusRating: number;
  calmRating: number;
  eyeStrainRating: number;
  difficultyRating: number;
  notes: string;
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
  const routine = loadRoutineSelection();
  const script = useMemo(() => createSessionScript(), []);
  const totalDuration = useMemo(() => getScriptTotalDuration(script), [script]);

  const audioRef = useRef(new SessionAudioController());
  const faceDetectorRef = useRef(new SessionFaceDetector());
  const faceLandmarkerRef = useRef(new SessionFaceLandmarker());
  const previousPhaseIdRef = useRef<string | undefined>(script[0]?.id);
  const cameraCheckVideoRef = useRef<HTMLVideoElement | null>(null);
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
  const [researchStep, setResearchStep] = useState<ResearchStep>("setup");
  const [setupConfirmed, setSetupConfirmed] = useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [panelsOpen, setPanelsOpen] = useState<PanelState>({
    measurement: true,
    protocol: true,
    liveSignals: false,
    graphs: false,
  });
  const [survey, setSurvey] = useState<PilotSurveyState>({
    focus: 5,
    calm: 5,
    eyeStrain: 1,
    difficulty: 5,
    notes: "",
  });
  const [latestPilotRecord, setLatestPilotRecord] = useState<PilotSummaryRecord | null>(null);
  const [latestPilotStorageKey, setLatestPilotStorageKey] = useState("");
  const sessionAttentionSamplesRef = useRef<number[]>([]);
  const sessionBlinkRateSamplesRef = useRef<number[]>([]);
  const sessionClosureBurdenSamplesRef = useRef<number[]>([]);
  const sessionSignalCoverageSamplesRef = useRef<number[]>([]);
  const sessionSignalQualitySamplesRef = useRef<SignalQuality[]>([]);

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
  const [feeling, setFeeling] = useState<SessionFeeling>("");
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
    sessionAttentionSamplesRef.current = [];
    sessionBlinkRateSamplesRef.current = [];
    sessionClosureBurdenSamplesRef.current = [];
    sessionSignalCoverageSamplesRef.current = [];
    sessionSignalQualitySamplesRef.current = [];
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

    if (RESEARCH_MODE) {
      setResearchStep("survey");
      return;
    }

    // Compute newly-unlocked milestones for the summary screen.
    // We construct a provisional record with the session's gaze metrics
    // so the milestone tests can evaluate "what's true after tonight."
    const history = loadHistory();
    const provisional = {
      id: "pending",
      date: new Date().toISOString(),
      durationMin: Number((totalDuration / 60).toFixed(1)),
      timeOfDay: routine.timeOfDay,
      attentionScore,
      feeling,
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
    attachStreamToVideo(cameraCheckVideoRef.current, cameraStream);
    attachStreamToVideo(sessionVideoRef.current, cameraStream);

    return () => {
      attachStreamToVideo(cameraCheckVideoRef.current, null);
      attachStreamToVideo(sessionVideoRef.current, null);
    };
  }, [cameraStream, researchStep]);

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

      const activeVideo = sessionVideoRef.current ?? cameraCheckVideoRef.current;

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

      const activeVideo = sessionVideoRef.current ?? cameraCheckVideoRef.current;

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


  const handleContinueFromSetup = async () => {
    if (!setupConfirmed || !safetyConfirmed) return;
    if (!cameraStream) {
      await enableCamera();
    }
    setResearchStep("camera");
  };

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

    if (RESEARCH_MODE) {
      setResearchStep("session");
      setPanelsOpen({
        measurement: false,
        protocol: false,
        liveSignals: false,
        graphs: false,
      });
    }

    setIsRunning(true);
    await audioRef.current.playSoftTransitionCue(settings);
  };

  const handleSaveSession = () => {
    if (saved) return;

    if (!RESEARCH_MODE) {
      const trimmedNote = note.trim();
      const record = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        durationMin: Number((totalDuration / 60).toFixed(1)),
        timeOfDay: routine.timeOfDay,
        attentionScore,
        feeling,
        grade: (attentionScore >= 85 ? "A" : attentionScore >= 72 ? "B" : "C") as "A" | "B" | "C",
        blinkCount: metrics.blinkCount,
        avgDrift,
        avgRecovery,
        longestGazeSec: longestGazeRef.current,
        totalStillnessSec: totalStillnessRef.current,
        note: trimmedNote.length > 0 ? trimmedNote : undefined,
        newMilestones: pendingMilestones.length > 0 ? pendingMilestones : undefined,
      };

      saveSession(record);           // local cache — instant
      void saveSessionRemote(record); // Supabase — fire and forget

      setSaved(true);
      navigate("/");
      return;
    }

    const timestamp = new Date();
    const userId = readResearchUserId();
    const sessionId = `${userId}_${formatTimestampForKey(timestamp)}`;

    const qualitySamples = sessionSignalQualitySamplesRef.current;
    const qualityEnd =
      qualitySamples.length > 0 ? qualitySamples[qualitySamples.length - 1] : signalQuality;

    const record: PilotSummaryRecord = {
      sessionId,
      userId,
      timestampIso: timestamp.toISOString(),
      timestampLabel: timestamp.toLocaleString(),
      protocolVersion: "research-v1",
      totalDurationSec: totalDuration,
      attentionEstimateFinal: attentionScore,
      attentionEstimateAvg: Number(avg(sessionAttentionSamplesRef.current).toFixed(1)),
      blinkRateAvg: Number(avg(sessionBlinkRateSamplesRef.current).toFixed(1)),
      closureBurdenAvg: Number(avg(sessionClosureBurdenSamplesRef.current).toFixed(1)),
      validSignalCoverageAvg: Number(avg(sessionSignalCoverageSamplesRef.current).toFixed(1)),
      longClosuresTotal: longClosureTimesRef.current.length,
      signalQualityEnd: qualityEnd,
      focusRating: survey.focus,
      calmRating: survey.calm,
      eyeStrainRating: survey.eyeStrain,
      difficultyRating: survey.difficulty,
      notes: survey.notes,
    };

    const existingCsv = localStorage.getItem("focusflow_research_sessions_csv") ?? "";
    const csvParts = buildPilotCsvRow(record);
    const updatedCsv = appendCsvWithHeader(existingCsv, csvParts.header, csvParts.row);

    localStorage.setItem("focusflow_research_sessions_csv", updatedCsv);
    localStorage.setItem("focusflow_research_last_session", JSON.stringify(record));

    setLatestPilotRecord(record);
    setLatestPilotStorageKey(sessionId);
    setSaved(true);
    setResearchStep("summary");
  };

  const handleExportResearchCsv = () => {
    const userId = readResearchUserId();
    const csv = localStorage.getItem("focusflow_research_sessions_csv") ?? "";
    if (!csv.trim()) return;
    downloadTextFile(
      `focusflow_research_sessions_${userId}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  };

  const handleResetResearchFlow = () => {
    setIsRunning(false);
    setSessionComplete(false);
    setSaved(false);
    setPhaseIndex(0);
    setPhaseSecondsLeft(script[0]?.durationSec ?? 0);
    setFeeling("");
    setSurvey({
      focus: 5,
      calm: 5,
      eyeStrain: 1,
      difficulty: 5,
      notes: "",
    });
    disableCamera();
    setResearchStep("setup");
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
    : isBodyPhase || isGazePhase || isEyesClosedPhase
    ? ""
    : isBreathPhase
    ? (currentPhase?.breathAction === "inhale" ? "Inhale" : "Exhale")
    : isIntegratePhase
    ? "Rest"
    : currentPhase?.instruction ?? "";

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

  const renderSetupSafetyCard = () => (
    <div
      className="glass-card"
      style={{
        width: "100%",
        maxWidth: "760px",
        padding: "24px 24px 28px",
        textAlign: "left",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: "12px", fontWeight: 400 }}>Setup & Safety</h2>
      <div style={{ color: "#d7c7b3", lineHeight: 1.55, marginBottom: "16px" }}>
        This version is for pilot testing. Follow setup and safety guidance before continuing.
      </div>

      <label
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
          color: "#F5E9DA",
          marginBottom: "12px",
          lineHeight: 1.5,
        }}
      >
        <input
          type="checkbox"
          checked={setupConfirmed}
          onChange={(event) => setSetupConfirmed(event.target.checked)}
          style={{ marginTop: "3px" }}
        />
        <span>
          I confirm that I am seated about one arm’s length from the screen, the target is
          roughly at eye level, my face is clearly visible in the camera with decent lighting,
          and I am not wearing glasses.
        </span>
      </label>

      <div style={{ color: "#cbbba7", fontSize: "14px", marginBottom: "14px" }}>
        Contacts are discouraged during pilot testing because they may affect blinking behavior.
      </div>

      <div
        style={{
          padding: "14px",
          borderRadius: "14px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#F5E9DA",
          lineHeight: 1.55,
          marginBottom: "14px",
        }}
      >
        <div style={{ marginBottom: "8px", color: "#FFB347" }}>Safety notes</div>
        <div>• Do not use if you recently had eye surgery.</div>
        <div>
          • Do not use if you currently have eye pain, irritation, infection, or another active
          eye condition.
        </div>
        <div>• This practice may feel activating or uncomfortable for some people.</div>
        <div>
          • If you have relevant medical or mental health concerns, consult a qualified clinician
          before use.
        </div>
        <div>• Use at your own risk.</div>
      </div>

      <label
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
          color: "#F5E9DA",
          marginBottom: "12px",
          lineHeight: 1.5,
        }}
      >
        <input
          type="checkbox"
          checked={safetyConfirmed}
          onChange={(event) => setSafetyConfirmed(event.target.checked)}
          style={{ marginTop: "3px" }}
        />
        <span>
          I understand the safety notes, privacy note, and that this is an experimental
          research-mode tool. I will stop the session if I experience eye strain, dizziness,
          emotional distress, or unusual discomfort.
        </span>
      </label>

      <div style={{ color: "#cbbba7", fontSize: "14px", lineHeight: 1.5, marginBottom: "18px" }}>
        Webcam data is processed locally in the browser. Session metrics are saved locally on
        this device for research testing. No video is stored or transmitted.
      </div>

      <button
        className="primary-button"
        onClick={handleContinueFromSetup}
        disabled={!setupConfirmed || !safetyConfirmed}
      >
        Continue to Camera Check
      </button>
    </div>
  );

  const renderCameraCheckCard = () => {
    const eyesTracked =
      Boolean(eyeSnapshot?.facePresent) &&
      eyeStatus !== "no landmarks" &&
      eyeStatus !== "loading" &&
      eyeStatus !== "error";

    return (
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "760px",
          padding: "24px 24px 28px",
          textAlign: "left",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "12px", fontWeight: 400 }}>Camera Check</h2>
        <div style={{ color: "#d7c7b3", lineHeight: 1.55, marginBottom: "18px" }}>
          Center your face, keep the target near eye level, and use soft front lighting.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 220px) minmax(0, 1fr)",
            gap: "16px",
            alignItems: "start",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              borderRadius: "16px",
              overflow: "hidden",
              background: "rgba(0,0,0,0.28)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <video
              ref={cameraCheckVideoRef}
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
          </div>

          <div
            style={{
              borderRadius: "16px",
              padding: "14px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#F5E9DA",
              lineHeight: 1.6,
            }}
          >
            <div>Camera status: {cameraState}</div>
            <div>Face status: {faceStatus}</div>
            <div>Eye status: {eyeStatus}</div>
            <div>
              Signal quality:{" "}
              {signalQuality === "good" ? "Good" : signalQuality === "fair" ? "Fair" : "Poor"}
            </div>
            <div>Face detected: {faceSnapshot?.facePresent ? "Yes" : "No"}</div>
            <div>Eyes tracked: {eyesTracked ? "Yes" : "No"}</div>
            {faceSnapshot?.facePresent && (
              <div>Face confidence: {Math.round(faceSnapshot.confidence * 100)}%</div>
            )}
            {liveEyeOpenness !== null && <div>Eye openness: {liveEyeOpenness.toFixed(4)}</div>}
            {signalQuality === "poor" && (
              <div style={{ color: "#FFB347", marginTop: "8px" }}>
                Tracking is currently weak. Improve lighting or face position before starting.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="secondary-button" onClick={() => setResearchStep("setup")}>
            Back
          </button>
          <button
            className="primary-button"
            onClick={handleStart}
            disabled={
              cameraState !== "granted" ||
              !faceSnapshot?.facePresent ||
              !eyeSnapshot?.facePresent ||
              signalQuality === "poor"
            }
          >
            Start Session
          </button>
        </div>
      </div>
    );
  };

  const renderSurveyCard = () => (
    <div
      className="glass-card"
      style={{
        width: "100%",
        maxWidth: "760px",
        padding: "24px 24px 28px",
        textAlign: "left",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: "18px", fontWeight: 400 }}>
        Post-Session Survey
      </h2>

      {(
        [
          ["focus", "Focus"],
          ["calm", "Calm"],
          ["eyeStrain", "Eye strain"],
          ["difficulty", "Difficulty"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} style={{ marginBottom: "18px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
              color: "#F5E9DA",
            }}
          >
            <span>{label}</span>
            <span>{survey[key]}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={survey[key]}
            onChange={(event) =>
              setSurvey((prev) => ({
                ...prev,
                [key]: Number(event.target.value),
              }))
            }
            style={{ width: "100%" }}
          />
        </div>
      ))}

      <div style={{ marginBottom: "18px" }}>
        <div style={{ color: "#F5E9DA", marginBottom: "8px" }}>Notes</div>
        <textarea
          value={survey.notes}
          onChange={(event) =>
            setSurvey((prev) => ({
              ...prev,
              notes: event.target.value,
            }))
          }
          rows={4}
          style={{
            width: "100%",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "#F5E9DA",
            padding: "10px 12px",
            resize: "vertical",
          }}
        />
      </div>

      <button className="primary-button" onClick={handleSaveSession}>
        Save Summary
      </button>
    </div>
  );

  const renderResearchSummaryCard = () => (
    <div
      className="glass-card"
      style={{
        width: "100%",
        maxWidth: "760px",
        padding: "24px 24px 28px",
        textAlign: "center",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: "18px", fontWeight: 400 }}>Session Summary</h2>

      <div style={{ fontSize: "64px", color: "#FFB347", marginBottom: "8px" }}>
        {attentionScore}
      </div>

      <div style={{ color: "#cbbba7", fontSize: "18px", marginBottom: "22px" }}>
        Attention Estimate
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px",
          textAlign: "left",
          marginBottom: "18px",
          color: "#F5E9DA",
        }}
      >
        <div>Average blink rate: {avg(sessionBlinkRateSamplesRef.current).toFixed(1)} / min</div>
        <div>Average closure burden: {avg(sessionClosureBurdenSamplesRef.current).toFixed(1)}%</div>
        <div>
          Valid signal coverage: {avg(sessionSignalCoverageSamplesRef.current).toFixed(1)}%
        </div>
        <div>Long closures: {longClosureTimesRef.current.length}</div>
      </div>

      <div
        style={{
          padding: "14px",
          borderRadius: "14px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          marginBottom: "18px",
          textAlign: "left",
          color: "#F5E9DA",
          lineHeight: 1.6,
        }}
      >
        <div>Focus: {survey.focus}</div>
        <div>Calm: {survey.calm}</div>
        <div>Eye strain: {survey.eyeStrain}</div>
        <div>Difficulty: {survey.difficulty}</div>
        {survey.notes.trim() && <div>Notes: {survey.notes}</div>}
        {latestPilotRecord && <div>Saved at: {latestPilotRecord.timestampLabel}</div>}
        {latestPilotStorageKey && <div>Saved locally as: {latestPilotStorageKey}</div>}
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        <button className="secondary-button" onClick={handleExportResearchCsv}>
          Export CSV
        </button>
        <button className="secondary-button" onClick={() => navigate("/")}>
          Back Home
        </button>
        <button className="primary-button" onClick={handleResetResearchFlow}>
          Run Again
        </button>
      </div>
    </div>
  );
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
        sessionSignalQualitySamplesRef.current.push(signalQuality);
        sessionSignalQualitySamplesRef.current =
          sessionSignalQualitySamplesRef.current.slice(-600);
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

        sessionAttentionSamplesRef.current.push(nextDisplayed);
        sessionAttentionSamplesRef.current =
          sessionAttentionSamplesRef.current.slice(-600);

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

      sessionBlinkRateSamplesRef.current.push(liveBlinkRatePerMinute);
      sessionBlinkRateSamplesRef.current =
        sessionBlinkRateSamplesRef.current.slice(-600);

      sessionClosureBurdenSamplesRef.current.push(closureBurdenPercent);
      sessionClosureBurdenSamplesRef.current =
        sessionClosureBurdenSamplesRef.current.slice(-600);

      sessionSignalCoverageSamplesRef.current.push(validSignalCoveragePercent);
      sessionSignalCoverageSamplesRef.current =
        sessionSignalCoverageSamplesRef.current.slice(-600);

      sessionSignalQualitySamplesRef.current.push(signalQuality);
      sessionSignalQualitySamplesRef.current =
        sessionSignalQualitySamplesRef.current.slice(-600);
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
        }}
      >
        {RESEARCH_MODE ? (
          researchStep === "setup" ? (
            renderSetupSafetyCard()
          ) : researchStep === "camera" ? (
            renderCameraCheckCard()
          ) : researchStep === "survey" ? (
            renderSurveyCard()
          ) : researchStep === "summary" ? (
            renderResearchSummaryCard()
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
                    <div>Face status: {faceStatus}</div>
                    {faceSnapshot?.facePresent && (
                      <div>
                        Confidence: {Math.round(faceSnapshot.confidence * 100)}%
                        {faceSnapshot.centered ? " • centered" : " • adjust position"}
                      </div>
                    )}
                    <div>Eye status: {eyeStatus}</div>
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
                    justifyContent: isBodyPhase ? "flex-start" : "center",
                    paddingTop: isBodyPhase ? "clamp(12px, 2vh, 28px)" : 0,
                    gap: "12px",
                  }}
                >
                  {/* Body cue: proper flex sibling ABOVE the figure container so
                      it can never overlap the SVG regardless of viewport size. */}
                  {isBodyPhase && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                      <div
                        style={{
                          fontSize: "11px",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "rgba(203, 183, 158, 0.45)",
                          fontFamily: '"Playfair Display", Georgia, serif',
                        }}
                      >
                        {bodyCue}
                      </div>
                      <div
                        style={{
                          fontSize: "26px",
                          fontFamily: '"Playfair Display", Georgia, serif',
                          fontWeight: 400,
                          color: "rgba(245, 233, 218, 0.82)",
                          lineHeight: 1.2,
                        }}
                      >
                        {bodyRegionLabel}
                      </div>
                    </div>
                  )}

                  {!isBodyPhase && primaryInstruction && (
                    <div
                      style={{
                        fontSize: isIntegratePhase ? "clamp(40px, 6vw, 56px)" : "22px",
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontWeight: 400,
                        fontStyle: isIntegratePhase ? "italic" : "normal",
                        color: "rgba(245, 233, 218, 0.78)",
                        lineHeight: isIntegratePhase ? 1.1 : 1.5,
                        letterSpacing: "0.01em",
                        maxWidth: isIntegratePhase ? undefined : "32ch",
                        textAlign: "center",
                        transition: "font-size 0.6s ease, opacity 0.6s ease",
                      }}
                    >
                      {primaryInstruction}
                    </div>
                  )}

                  {/* Visual container — no text lives inside here.
                      overflow:hidden only on body phase to contain the SVG figure.
                      Eyes-closed phase: BrushstrokeEyes is a flow element with own height. */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      maxWidth: "760px",
                      minHeight: isSettlePhase
                        ? "clamp(180px, 30vh, 260px)"
                        : isBodyPhase
                        ? "clamp(360px, 56vh, 460px)"
                        : isEyesClosedPhase
                        ? 0
                        : "clamp(240px, 38vh, 340px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: isEyesClosedPhase ? "visible" : "hidden",
                    }}
                  >
                    {showDiya && (
                      <div
                        style={{
                          position: "relative",
                          mixBlendMode: "screen",
                          transition: "opacity 0.5s ease",
                          lineHeight: 0,
                        }}
                      >
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
                        {/* Black vignette overlay: screen-blend makes black = invisible,
                            so the black edges vanish against ANY background. No colour
                            matching needed. The diya centre stays transparent (untouched). */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "radial-gradient(ellipse 82% 86% at center 46%, transparent 0%, transparent 50%, rgba(0,0,0,0.5) 66%, rgba(0,0,0,0.85) 78%, rgba(0,0,0,0.96) 88%, black 96%)",
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                    )}

                    {isBodyPhase && currentPhase?.bodyRegion && (
                      <BodyGuideOverlay
                        activeRegion={currentPhase.bodyRegion}
                        phaseSecondsLeft={phaseSecondsLeft}
                      />
                    )}

                    {isBreathPhase && currentPhase?.breathAction && (
                      <BreathGuide
                        action={currentPhase.breathAction}
                        durationSec={currentPhase.durationSec}
                      />
                    )}

                    {(isSettlePhase || isIntegratePhase) && <SettleHalo />}

                    {isEyesClosedPhase && <BrushstrokeEyes />}
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
                    height: "4px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.04)",
                    overflow: "visible",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(0.02, overallProgress) * 100}%`,
                      height: "100%",
                      borderRadius: "inherit",
                      background:
                        "linear-gradient(90deg, rgba(240,168,86,0.92), rgba(255,226,183,0.88))",
                      transition: isRunning ? "width 1s linear" : "width 0.35s ease",
                      boxShadow: "0 0 12px rgba(255,179,71,0.45)",
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
          )
        ) : (
sessionComplete ? (
          RESEARCH_MODE ? renderResearchSummaryCard() : (
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
          )
        ) : (
          <>
            {((!isRunning && (cameraStream || cameraState === "requesting")) || (isRunning && isDebugMode)) && (
              <div
                style={{
                  position: "fixed",
                  top: "18px",
                  right: "18px",
                  width: "clamp(150px, 26vw, 220px)",
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
                  <div>{RESEARCH_MODE ? "Face status" : "Face"}: {faceStatus}</div>
                  {faceSnapshot?.facePresent && (
                    <div>
                      Confidence: {Math.round(faceSnapshot.confidence * 100)}%
                      {faceSnapshot.centered ? " • centered" : " • adjust position"}
                    </div>
                  )}
                  <div>{RESEARCH_MODE ? "Eye status" : "Eyes"}: {eyeStatus}</div>
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
                  justifyContent: isBodyPhase ? "flex-start" : "center",
                  paddingTop: isBodyPhase ? "clamp(12px, 2vh, 28px)" : 0,
                  gap: "20px",
                }}
              >
                {isBodyPhase && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "rgba(203, 183, 158, 0.45)",
                      }}
                    >
                      {bodyCue}
                    </div>
                    <div
                      style={{
                        fontSize: "26px",
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontWeight: 400,
                        color: "rgba(245, 233, 218, 0.82)",
                        lineHeight: 1.2,
                      }}
                    >
                      {bodyRegionLabel}
                    </div>
                  </div>
                )}

                {!isBodyPhase && primaryInstruction && (
                  <div
                    style={{
                      fontSize: "22px",
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontWeight: 400,
                      color: "rgba(245, 233, 218, 0.68)",
                      lineHeight: 1.5,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {primaryInstruction}
                  </div>
                )}

                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    maxWidth: "760px",
                    minHeight: isSettlePhase
                      ? "clamp(180px, 30vh, 260px)"
                      : isBodyPhase
                      ? "clamp(360px, 56vh, 460px)"
                      : isEyesClosedPhase
                      ? 0
                      : "clamp(260px, 42vh, 360px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: isEyesClosedPhase ? "visible" : "hidden",
                  }}
                >
                  {showDiya && (
                    <div
                      style={{
                        position: "relative",
                        mixBlendMode: "screen",
                        transition: "opacity 0.5s ease",
                        lineHeight: 0,
                      }}
                    >
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
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "radial-gradient(ellipse 82% 86% at center 46%, transparent 0%, transparent 50%, rgba(0,0,0,0.5) 66%, rgba(0,0,0,0.85) 78%, rgba(0,0,0,0.96) 88%, black 96%)",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  )}

                  {isBodyPhase && currentPhase?.bodyRegion && (
                    <BodyGuideOverlay
                      activeRegion={currentPhase.bodyRegion}
                      phaseSecondsLeft={phaseSecondsLeft}
                    />
                  )}

                  {isBreathPhase && currentPhase?.breathAction && (
                    <BreathGuide
                      action={currentPhase.breathAction}
                      durationSec={currentPhase.durationSec}
                    />
                  )}

                  {(isSettlePhase || isIntegratePhase) && <SettleHalo />}

                  {isEyesClosedPhase && <BrushstrokeEyes />}
                </div>
              </div>{/* end centered group */}

              {!isRunning && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
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
                  height: "8px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.12)",
                  overflow: "hidden",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.24)",
                }}
              >
                <div
                  style={{
                    width: `${Math.max(0.02, overallProgress) * 100}%`,
                    height: "100%",
                    borderRadius: "inherit",
                    background:
                      "linear-gradient(90deg, rgba(240,168,86,0.96), rgba(255,226,183,0.92))",
                    transition: isRunning ? "width 1s linear" : "width 0.35s ease",
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
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace", marginTop: "2px", position: "relative", height: "14px" }}>
                    {(() => {
                      let acc = 0;
                      return script.map((phase, i) => {
                        const left = (acc / totalDuration) * 100;
                        acc += phase.durationSec;
                        return (
                          <span key={i} style={{ position: "absolute", left: `${left}%`, transform: "translateX(-50%)" }}>
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
                </div>
              )}
            </div>
          </>
        )
        )}
      </div>
    </MeditationBackground>
  );
}
































