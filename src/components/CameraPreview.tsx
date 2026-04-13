import { useEffect, useRef } from "react";

type CameraPreviewProps = {
  stream: MediaStream | null;
  visible: boolean;
};

export default function CameraPreview({
  stream,
  visible,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  if (!visible) return null;

  return (
    <div
      className="glass-card"
      style={{
        padding: "12px",
        width: "100%",
      }}
    >
      <div
        style={{
          fontSize: "15px",
          color: "#cbbba7",
          marginBottom: "10px",
        }}
      >
        Camera Preview
      </div>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: "100%",
          aspectRatio: "4 / 3",
          objectFit: "cover",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.04)",
          transform: "scaleX(-1)",
        }}
      />
    </div>
  );
}