import type { BodyRegion } from "../lib/sessionScript";

type BodyGuideOverlayProps = {
  activeRegion: BodyRegion;
  phaseSecondsLeft: number;
};

type CueState = "clench" | "release";

const phaseDurationHalf = 5;

function getCueState(phaseSecondsLeft: number): CueState {
  return phaseSecondsLeft > phaseDurationHalf ? "clench" : "release";
}

function partFill(active: boolean, cueState: CueState) {
  if (!active) return "rgba(119, 100, 82, 0.64)";
  return cueState === "clench"
    ? "rgba(242, 173, 92, 0.9)"
    : "rgba(118, 150, 184, 0.78)";
}

function partStroke(active: boolean, cueState: CueState) {
  if (!active) return "rgba(182, 156, 127, 0.28)";
  return cueState === "clench"
    ? "rgba(255, 224, 177, 0.95)"
    : "rgba(192, 215, 236, 0.85)";
}

export default function BodyGuideOverlay({
  activeRegion,
  phaseSecondsLeft,
}: BodyGuideOverlayProps) {
  const cueState = getCueState(phaseSecondsLeft);

  const fill = (region: BodyRegion) => partFill(activeRegion === region, cueState);
  const stroke = (region: BodyRegion) => partStroke(activeRegion === region, cueState);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(8, 7, 10, 0.2)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: "560px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "280px",
            height: "330px",
          }}
        >
          <svg
            width="280"
            height="330"
            viewBox="0 0 240 360"
            fill="none"
            style={{ width: "100%", height: "100%" }}
          >
            <circle
              cx="120"
              cy="55"
              r="24"
              fill={fill("face")}
              stroke={stroke("face")}
              strokeWidth="2"
            />

            <rect
              x="110"
              y="82"
              width="20"
              height="20"
              rx="10"
              fill={fill("neck")}
              stroke={stroke("neck")}
              strokeWidth="2"
            />

            <rect
              x="85"
              y="102"
              width="70"
              height="95"
              rx="30"
              fill={fill("backShoulders")}
              stroke={stroke("backShoulders")}
              strokeWidth="2"
            />

            <rect
              x="45"
              y="110"
              width="34"
              height="105"
              rx="17"
              fill={fill("armsFingers")}
              stroke={stroke("armsFingers")}
              strokeWidth="2"
            />
            <rect
              x="161"
              y="110"
              width="34"
              height="105"
              rx="17"
              fill={fill("armsFingers")}
              stroke={stroke("armsFingers")}
              strokeWidth="2"
            />

            <rect
              x="80"
              y="196"
              width="80"
              height="32"
              rx="16"
              fill={fill("pelvis")}
              stroke={stroke("pelvis")}
              strokeWidth="2"
            />

            <rect
              x="70"
              y="228"
              width="42"
              height="70"
              rx="20"
              fill={fill("thighs")}
              stroke={stroke("thighs")}
              strokeWidth="2"
            />
            <rect
              x="128"
              y="228"
              width="42"
              height="70"
              rx="20"
              fill={fill("thighs")}
              stroke={stroke("thighs")}
              strokeWidth="2"
            />

            <rect
              x="74"
              y="294"
              width="30"
              height="42"
              rx="15"
              fill={fill("calves")}
              stroke={stroke("calves")}
              strokeWidth="2"
            />
            <rect
              x="136"
              y="294"
              width="30"
              height="42"
              rx="15"
              fill={fill("calves")}
              stroke={stroke("calves")}
              strokeWidth="2"
            />

            <ellipse
              cx="89"
              cy="342"
              rx="28"
              ry="12"
              fill={fill("feet")}
              stroke={stroke("feet")}
              strokeWidth="2"
            />
            <ellipse
              cx="151"
              cy="342"
              rx="28"
              ry="12"
              fill={fill("feet")}
              stroke={stroke("feet")}
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
