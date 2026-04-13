type SessionProgressProps = {
  progress: number;
};

function YogiIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <circle cx="32" cy="12" r="7" fill="#F5E9DA" />
      <rect x="23" y="21" width="18" height="18" rx="8" fill="#F5E9DA" />
      <path
        d="M18 31 C18 28, 22 28, 24 30 L28 35 C29.5 37, 27.5 40, 24.5 39 L18 37 C15 36, 14.5 32.5, 18 31Z"
        fill="#F5E9DA"
      />
      <path
        d="M46 31 C46 28, 42 28, 40 30 L36 35 C34.5 37, 36.5 40, 39.5 39 L46 37 C49 36, 49.5 32.5, 46 31Z"
        fill="#F5E9DA"
      />
      <path
        d="M14 44 C14 39, 20 38, 24 40 L31 44 C33.5 45.5, 33.5 49.5, 30 50 L18 51 C14.5 51.3, 12.5 47.5, 14 44Z"
        fill="#F5E9DA"
      />
      <path
        d="M50 44 C50 39, 44 38, 40 40 L33 44 C30.5 45.5, 30.5 49.5, 34 50 L46 51 C49.5 51.3, 51.5 47.5, 50 44Z"
        fill="#F5E9DA"
      />
    </svg>
  );
}

export default function SessionProgress({ progress }: SessionProgressProps) {
  const safeProgress = Math.max(0, Math.min(1, progress));
  const left = `calc(${safeProgress * 100}% - 15px)`;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "920px",
        margin: "0 auto",
        padding: "0 6px",
      }}
    >
      <div
        style={{
          position: "relative",
          height: "40px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            height: "22px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.24)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${safeProgress * 100}%`,
              height: "100%",
              borderRadius: "999px",
              background: "rgba(245,233,218,0.82)",
              transition: "width 0.9s linear",
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            left,
            top: "50%",
            transform: "translateY(-50%)",
            transition: "left 0.9s linear",
            zIndex: 2,
          }}
        >
          <YogiIcon />
        </div>
      </div>
    </div>
  );
}