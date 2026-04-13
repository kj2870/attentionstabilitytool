import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Diya from "../components/Diya";
import MeditationBackground from "../components/MeditationBackground";
import BodyGuideOverlay from "../components/BodyGuideOverlay";
import BreathGuide from "../components/BreathGuide";
import type { TrackingMetrics } from "../lib/trackingEngine";
import {
  createSessionScript,
  getScriptTotalDuration,
  type BodyRegion,
  type SessionPhase,
} from "../lib/sessionScript";
import {
  getCurrentStreak,
  loadHistory,
  loadRoutineSelection,
  saveSession,
  saveSessionRemote,
  type SessionFeeling,
} from "../lib/storage";
import { getQuoteForStreak } from "../lib/quotes";
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

function avgDiff(values: number[]) {
  if (values.length < 2) return 0;

  let total = 0;
  for (let index = 1; index < values.length; index += 1) {
    total += values[index] - values[index - 1];
  }

  return total / (values.length - 1);
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

function formatSecondsCompact(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
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
        background: "rgba(255,255,255,0.028)",
        border: "1px solid rgba(255,255,255,0.12)",
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
          color: "#F5E9DA",
          padding: 0,
          cursor: "pointer",
          fontSize: "15px",
        }}
      >
        <span>{title}</span>
        <span style={{ color: "rgba(245,233,218,0.68)", fontSize: "12px" }}>
          {open ? "Hide" : "Show"}
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

  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(
    script[0]?.durationSec ?? 0
  );
  const [sessionComplete, setSessionComplete] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feeling, setFeeling] = useState<SessionFeeling>("");
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


  const currentPhase: SessionPhase | undefined = script[phaseIndex];

  const protocolReference = useMemo(() => {
    const settleSeconds = script
      .filter((phase) => phase.visualMode === "settle")
      .reduce((sum, phase) => sum + phase.durationSec, 0);

    const bodySeconds = script
      .filter((phase) => phase.visualMode === "body")
      .reduce((sum, phase) => sum + phase.durationSec, 0);

    const breathSeconds = script
      .filter((phase) => phase.visualMode === "breath")
      .reduce((sum, phase) => sum + phase.durationSec, 0);

    const gazePhases = script.filter((phase) => phase.visualMode === "gaze");
    const eyesClosedPhases = script.filter((phase) => phase.visualMode === "eyesClosed");

    const gazeSeconds = gazePhases.reduce((sum, phase) => sum + phase.durationSec, 0);
    const eyesClosedSeconds = eyesClosedPhases.reduce((sum, phase) => sum + phase.durationSec, 0);

    const integrateSeconds = script
      .filter((phase) => phase.visualMode === "integrate")
      .reduce((sum, phase) => sum + phase.durationSec, 0);

    return [
      {
        label: "Settle",
        detail: "posture + stillness",
        duration: `${formatSecondsCompact(settleSeconds)}`,
      },
      {
        label: "Tense + release",
        detail: "whole-body sequence",
        duration: `${formatSecondsCompact(bodySeconds)}`,
      },
      {
        label: "Regulate",
        detail: "10 slow breaths",
        duration: `${formatSecondsCompact(breathSeconds)}`,
      },
      {
        label: "Focus",
        detail: `${gazePhases.length} gaze rounds`,
        duration: `${formatSecondsCompact(gazeSeconds)}`,
      },
      {
        label: "Eyes closed",
        detail: `${eyesClosedPhases.length} recovery rounds`,
        duration: `${formatSecondsCompact(eyesClosedSeconds)}`,
      },
      {
        label: "Integrate",
        detail: "open awareness",
        duration: `${formatSecondsCompact(integrateSeconds)}`,
      },
      {
        label: "Total",
        detail: "full protocol",
        duration: `${formatSecondsCompact(totalDuration)}`,
      },
    ];
  }, [script, totalDuration]);

  const measurementReference = useMemo(
    () => [
      "Attention estimate (0–100): recent attentional engagement from blink rate, closure burden, openness stability, long closures, and signal coverage.",
      "Blink rate: quick blink events per minute from a rolling short window.",
      "Closure burden: percent of recent valid eye samples spent near-closed.",
      "Long closures: eye closures >500 ms in the last 30s, tracked separately from normal blinks.",
      "Valid signal coverage: percent of recent eye samples judged usable.",
      "Signal quality: whether current face/eye tracking is good, fair, or poor.",
    ],
    []
  );
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
    }
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

  // Keeps quote/streak logic available for non-research mode.
  const projectedStreak = useMemo(() => {
    if (RESEARCH_MODE) return 0;

    const history = loadHistory();

    return getCurrentStreak([
      ...history,
      {
        id: "preview",
        date: new Date().toISOString(),
        durationMin: Number((totalDuration / 60).toFixed(1)),
        timeOfDay: routine.timeOfDay,
        attentionScore,
        feeling,
        grade: attentionScore >= 85 ? "A" : attentionScore >= 72 ? "B" : "C",
      },
    ]);
  }, [attentionScore, feeling, routine.timeOfDay, totalDuration]);

  const quote = RESEARCH_MODE ? "" : getQuoteForStreak(projectedStreak);

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

  const phaseLabel = sessionComplete ? "Session Summary" : currentPhase?.label ?? "";
  const bodyCue = isBodyPhase ? getBodyCue(phaseSecondsLeft) : "";
  const bodyRegionLabel =
    isBodyPhase && currentPhase?.bodyRegion
      ? BODY_REGION_LABELS[currentPhase.bodyRegion]
      : "";

  const primaryInstruction = sessionComplete
    ? ""
    : isBodyPhase || isBreathPhase || isGazePhase
    ? ""
    : isEyesClosedPhase
    ? "Rest"
    : isIntegratePhase
    ? "Open awareness"
    : currentPhase?.instruction ?? "";

  // Interpretable stability label from recent attention variation.
  const signalStability = useMemo(() => {
    if (attentionHistory.length < 4) return "moderate";

    let totalChange = 0;
    for (let i = 1; i < attentionHistory.length; i += 1) {
      totalChange += Math.abs(attentionHistory[i] - attentionHistory[i - 1]);
    }

    const meanChange = totalChange / (attentionHistory.length - 1);

    if (meanChange < 1.6) return "stable";
    if (meanChange < 4.2) return "moderate";
    return "variable";
  }, [attentionHistory]);

  // Live blink rate estimate based on elapsed session time.
  const blinkRatePerMinute = useMemo(() => {
    const minutes = Math.max(elapsedSeconds, 1) / 60;
    return blinkCountLive / minutes;
  }, [blinkCountLive, elapsedSeconds]);

  const liveBlinkRatePerMinute = useMemo(() => {
    if (blinkRateHistory.length === 0) return 0;
    return blinkRateHistory[blinkRateHistory.length - 1];
  }, [blinkRateHistory]);

  const closureBurdenPercent = useMemo(() => {
    if (closureBurdenHistory.length === 0) return 0;
    return closureBurdenHistory[closureBurdenHistory.length - 1];
  }, [closureBurdenHistory]);

  const avgClosureDurationMs = useMemo(() => {
    if (closureDurationsRef.current.length === 0) return 0;
    return avg(closureDurationsRef.current);
  }, [blinkCountLive, closureBurdenHistory]);

  const avgInterBlinkIntervalSec = useMemo(() => {
    if (blinkEventTimesRef.current.length < 2) return 0;
    return avgDiff(blinkEventTimesRef.current) / 1000;
  }, [blinkCountLive]);

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

  const attentionDisplayLabel =
    signalQuality === "poor"
      ? `${attentionScore} (low confidence)`
      : `${attentionScore}`;
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
    <MeditationBackground timeOfDay={routine.timeOfDay}>
      <div
        className="page-shell mobile-stack"
        style={{
          minHeight: "100vh",
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
              {researchStep === "session" && (
                <div
                  style={{
                    position: "fixed",
                    top: "18px",
                    left: "18px",
                    width: "clamp(240px, 28vw, 320px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    zIndex: 35,
                  }}
                >
                  <div
                    style={{
                      borderRadius: "16px",
                      background: "rgba(0,0,0,0.30)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
                      backdropFilter: "blur(8px)",
                      padding: "12px 14px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => togglePanel("measurement")}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "transparent",
                        border: "none",
                        color: "#F5E9DA",
                        padding: 0,
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      <span>Measurement Reference</span>
                      <span style={{ color: "rgba(245,233,218,0.68)", fontSize: "11px" }}>
                        {panelsOpen.measurement ? "Hide" : "Show"}
                      </span>
                    </button>

                    {panelsOpen.measurement && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          fontSize: "11px",
                          lineHeight: 1.45,
                          color: "#d9cbb8",
                          marginTop: "8px",
                        }}
                      >
                        {measurementReference.map((item) => (
                          <div key={item}>{item}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      borderRadius: "16px",
                      background: "rgba(0,0,0,0.30)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
                      backdropFilter: "blur(8px)",
                      padding: "12px 14px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => togglePanel("protocol")}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "transparent",
                        border: "none",
                        color: "#F5E9DA",
                        padding: 0,
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      <span>Protocol Reference</span>
                      <span style={{ color: "rgba(245,233,218,0.68)", fontSize: "11px" }}>
                        {panelsOpen.protocol ? "Hide" : "Show"}
                      </span>
                    </button>

                    {panelsOpen.protocol && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: "6px 10px",
                          fontSize: "11px",
                          lineHeight: 1.45,
                          color: "#d9cbb8",
                          marginTop: "8px",
                        }}
                      >
                        {protocolReference.map((item) => (
                          <Fragment key={item.label}>
                            <div>
                              {item.label}
                              <span style={{ color: "rgba(245,233,218,0.56)" }}>
                                {" "}
                                • {item.detail}
                              </span>
                            </div>
                            <div>{item.duration}</div>
                          </Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(researchStep === "session" || cameraStream || cameraState === "requesting") && (
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
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    minHeight: isBodyPhase ? "108px" : "78px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "20px",
                      color: "#FFB347",
                    }}
                  >
                    {phaseLabel}
                  </div>

                  {isBodyPhase && (
                    <>
                      <div
                        style={{
                          fontSize: "14px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "rgba(223, 203, 178, 0.78)",
                        }}
                      >
                        {bodyCue}
                      </div>

                      <div
                        style={{
                          fontSize: "28px",
                          color: "#F5E9DA",
                          lineHeight: 1.2,
                          minHeight: "34px",
                        }}
                      >
                        {bodyRegionLabel}
                      </div>
                    </>
                  )}

                  {!isBodyPhase && primaryInstruction && (
                    <div
                      style={{
                        minHeight: "34px",
                        fontSize: "24px",
                        color: "#F5E9DA",
                      }}
                    >
                      {primaryInstruction}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    maxWidth: "760px",
                    minHeight: isSettlePhase ? "120px" : "360px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "2px",
                  }}
                >
                  {showDiya && (
                    <div
                      style={{
                        transition: "0.5s ease",
                      }}
                    >
                      <Diya breathingGlow={isGazePhase} />
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
                </div>

                {isRunning && (
                  <CollapsibleCard
                    title="Live Signals"
                    open={panelsOpen.liveSignals}
                    onToggle={() => togglePanel("liveSignals")}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                        gap: "8px",
                        marginBottom: "12px",
                        fontSize: "13px",
                        color: "#d7c7b3",
                      }}
                    >
                      <div style={{ opacity: signalQuality === "poor" ? 0.72 : 1 }}>
                        Attention estimate (0–100): {attentionDisplayLabel}
                      </div>
                      <div>Raw estimate: {Math.round(rawAttentionEstimate)}</div>
                      <div>
                        Eye openness: {liveEyeOpenness !== null ? liveEyeOpenness.toFixed(4) : "—"}
                      </div>
                      <div>Blinks: {blinkCountLive}</div>
                      <div>Live blink rate: {liveBlinkRatePerMinute.toFixed(1)} / min</div>
                      <div>Session blink rate: {blinkRatePerMinute.toFixed(1)} / min</div>
                      <div>Closure burden: {closureBurdenPercent.toFixed(1)}%</div>
                      <div>Openness variability: {eyeOpennessStd.toFixed(4)}</div>
                      <div>
                        Avg closure:{" "}
                        {avgClosureDurationMs > 0 ? `${Math.round(avgClosureDurationMs)} ms` : "—"}
                      </div>
                      <div>
                        Inter-blink interval:{" "}
                        {avgInterBlinkIntervalSec > 0
                          ? `${avgInterBlinkIntervalSec.toFixed(1)} s`
                          : "—"}
                      </div>
                      <div>Long closures (30s): {recentLongClosures}</div>
                      <div>Valid signal coverage: {validSignalCoveragePercent.toFixed(0)}%</div>
                      <div>Face status: {faceStatus}</div>
                      <div>Eye status: {eyeStatus}</div>
                      <div>Signal stability: {signalStability}</div>
                      <div>
                        Signal quality:{" "}
                        {signalQuality === "good"
                          ? "Good"
                          : signalQuality === "fair"
                          ? "Fair"
                          : "Poor"}
                      </div>
                    </div>
                  </CollapsibleCard>
                )}

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

                {!isRunning && (
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
              </div>
            </>
          )
        ) : (
sessionComplete ? (
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "760px",
              padding: "24px 24px 28px",
              marginTop: "0",
              textAlign: "center",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "20px", fontWeight: 400 }}>
              Session Summary
            </h2>

            <div
              style={{
                fontSize: "64px",
                color: "#FFB347",
                marginBottom: "8px",
              }}
            >
              {attentionScore}
            </div>

            <div
              style={{
                color: "#cbbba7",
                fontSize: "18px",
                marginBottom: "22px",
              }}
            >
              {RESEARCH_MODE ? "Attention Estimate" : "Attention Score"}
            </div>

            {!RESEARCH_MODE && (
              <div
                style={{
                  padding: "18px",
                  borderRadius: "18px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,179,71,0.14)",
                  marginBottom: "22px",
                  color: "#F5E9DA",
                  lineHeight: 1.55,
                }}
              >
                {quote}
              </div>
            )}

            <div style={{ marginBottom: "22px" }}>
              <div
                style={{
                  color: "#cbbba7",
                  marginBottom: "12px",
                  fontSize: "16px",
                }}
              >
                How did it feel?
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {(["Calm", "Neutral", "Restless"] as SessionFeeling[]).map((item) => (
                  <button
                    key={item}
                    className="secondary-button"
                    onClick={() => setFeeling(item)}
                    style={{
                      background:
                        feeling === item
                          ? "rgba(255,179,71,0.14)"
                          : "rgba(255,255,255,0.04)",
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <button className="primary-button" onClick={handleSaveSession} disabled={saved}>
              Save Session
            </button>
          </div>
        ) : (
          <>
            {isRunning && (
              <div
                style={{
                  position: "fixed",
                  top: "18px",
                  left: "18px",
                  width: "clamp(240px, 28vw, 320px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  zIndex: 35,
                }}
              >
                <div
                  style={{
                    borderRadius: "16px",
                    background: "rgba(0,0,0,0.30)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
                    backdropFilter: "blur(8px)",
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#F5E9DA",
                      marginBottom: "8px",
                    }}
                  >
                    Measurement reference
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      fontSize: "11px",
                      lineHeight: 1.45,
                      color: "#d9cbb8",
                    }}
                  >
                    {measurementReference.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: "16px",
                    background: "rgba(0,0,0,0.30)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
                    backdropFilter: "blur(8px)",
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#F5E9DA",
                      marginBottom: "8px",
                    }}
                  >
                    Protocol reference
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: "6px 10px",
                      fontSize: "11px",
                      lineHeight: 1.45,
                      color: "#d9cbb8",
                    }}
                  >
                    {protocolReference.map((item) => (
                      <Fragment key={item.label}>
                        <div>
                          {item.label}
                          <span style={{ color: "rgba(245,233,218,0.56)" }}>
                            {" "}
                            • {item.detail}
                          </span>
                        </div>
                        <div>{item.duration}</div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {(isRunning || cameraStream || cameraState === "requesting") && (
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
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  minHeight: isBodyPhase ? "108px" : "78px",
                }}
              >
                <div
                  style={{
                    fontSize: "20px",
                    color: "#FFB347",
                  }}
                >
                  {phaseLabel}
                </div>

                {isBodyPhase && (
                  <>

                    <div
                      style={{
                        fontSize: "14px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "rgba(223, 203, 178, 0.78)",
                      }}
                    >
                      {bodyCue}
                    </div>

                    <div
                      style={{
                        fontSize: "28px",
                        color: "#F5E9DA",
                        lineHeight: 1.2,
                        minHeight: "34px",
                      }}
                    >
                      {bodyRegionLabel}
                    </div>
                  </>
                )}

                {!isBodyPhase && primaryInstruction && (
                  <div
                    style={{
                      minHeight: "34px",
                      fontSize: "24px",
                      color: "#F5E9DA",
                    }}
                  >
                    {primaryInstruction}
                  </div>
                )}
              </div>

              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: "760px",
                  minHeight: isSettlePhase ? "120px" : "360px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "2px",
                }}
              >


                {showDiya && (
                  <div
                    style={{
                      transition: "0.5s ease",
                    }}
                  >
                    <Diya breathingGlow={isGazePhase} />
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
              </div>

              {isRunning && (
                <div
                  className="glass-card"
                  style={{
                    width: "100%",
                    maxWidth: "760px",
                    padding: "16px 16px 14px",
                    textAlign: "left",
                    background: "rgba(255,255,255,0.028)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <div style={{ fontSize: "16px", color: "#d9cbb8", marginBottom: "10px" }}>
                    Live Signals
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                      gap: "8px",
                      marginBottom: "12px",
                      fontSize: "13px",
                      color: "#d7c7b3",
                    }}
                  >
                    <div
                      style={{
                        opacity: signalQuality === "poor" ? 0.72 : 1,
                      }}
                    >
                      Attention estimate (0–100): {attentionDisplayLabel}
                    </div>
                    <div>
                      Raw estimate: {Math.round(rawAttentionEstimate)}
                    </div>
                    <div>
                      Eye openness: {liveEyeOpenness !== null ? liveEyeOpenness.toFixed(4) : "—"}
                    </div>
                    <div>Blinks: {blinkCountLive}</div>
                    <div>Live blink rate: {liveBlinkRatePerMinute.toFixed(1)} / min</div>
                    <div>Session blink rate: {blinkRatePerMinute.toFixed(1)} / min</div>
                    <div>Closure burden: {closureBurdenPercent.toFixed(1)}%</div>
                    <div>
                      Openness variability: {eyeOpennessStd.toFixed(4)}
                    </div>
                    <div>
                      Avg closure:{" "}
                      {avgClosureDurationMs > 0 ? `${Math.round(avgClosureDurationMs)} ms` : "—"}
                    </div>
                    <div>
                      Inter-blink interval:{" "}
                      {avgInterBlinkIntervalSec > 0
                        ? `${avgInterBlinkIntervalSec.toFixed(1)} s`
                        : "—"}
                    </div>
                    <div>Long closures (30s): {recentLongClosures}</div>
                    <div>Valid signal coverage: {validSignalCoveragePercent.toFixed(0)}%</div>
                    <div>Face status: {faceStatus}</div>
                    <div>Eye status: {eyeStatus}</div>
                    <div>Signal stability: {signalStability}</div>
                    <div>
                      Signal quality:{" "}
                      {signalQuality === "good"
                        ? "Good"
                        : signalQuality === "fair"
                        ? "Fair"
                        : "Poor"}
                    </div>
                  </div>

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
                        liveEyeOpenness !== null ? liveEyeOpenness.toFixed(4) : "Current: —"
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
                </div>
              )}

              {!isRunning && (
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
            </div>
          </>
        )
        )}
      </div>
    </MeditationBackground>
  );
}
































