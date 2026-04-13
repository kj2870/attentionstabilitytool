type FlameProps = {
  breathingGlow?: boolean;
};

export default function Flame({ breathingGlow = false }: FlameProps) {
  return (
    <div
      style={{
        width: "120px",
        height: "120px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        filter: breathingGlow
          ? "drop-shadow(0 0 28px rgba(255,166,72,0.28))"
          : "drop-shadow(0 0 20px rgba(255,160,60,0.25))",
      }}
    >
      <svg
        width="80"
        height="100"
        viewBox="0 0 80 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse
          cx="40"
          cy="70"
          rx="22"
          ry="18"
          fill="rgba(255,170,80,0.25)"
        >
          {breathingGlow && (
            <animate
              attributeName="opacity"
              values="0.45;0.8;0.45"
              dur="5.4s"
              repeatCount="indefinite"
            />
          )}
        </ellipse>

        <path
          d="M40 5
             C52 25 60 42 50 65
             C45 80 35 80 30 65
             C20 42 28 25 40 5Z"
          fill="url(#flameGradient)"
        >
          <animateTransform
            attributeName="transform"
            type="scale"
            values={breathingGlow ? "1 1;1.02 0.985;1 1" : "1 1;1.03 0.98;1 1"}
            dur={breathingGlow ? "5.4s" : "2.4s"}
            repeatCount="indefinite"
          />
        </path>

        <path
          d="M40 22
             C47 38 48 52 43 62
             C40 68 36 68 33 62
             C28 52 33 38 40 22Z"
          fill="url(#innerGradient)"
        />

        <ellipse
          cx="40"
          cy="60"
          rx="6"
          ry="9"
          fill="white"
          opacity="0.9"
        />

        <defs>
          <linearGradient id="flameGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff7a30" />
            <stop offset="60%" stopColor="#ffb347" />
            <stop offset="100%" stopColor="#ffcf80" />
          </linearGradient>

          <linearGradient id="innerGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffd27d" />
            <stop offset="100%" stopColor="#fff4c9" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
