import Flame from "./Flame";

type DiyaProps = {
  breathingGlow?: boolean;
};

export default function Diya({ breathingGlow = false }: DiyaProps) {
  return (
    <div
      style={{
        position: "relative",
        width: "240px",
        height: "220px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "18px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
        }}
      >
        <Flame breathingGlow={breathingGlow} />
      </div>

      <div
        style={{
          position: "absolute",
          top: "102px",
          left: "52%",
          width: "38px",
          height: "10px",
          background: "linear-gradient(90deg, #5b4532 0%, #8a6a48 100%)",
          borderRadius: "999px",
          transform: "translateX(-50%) rotate(-12deg)",
          zIndex: 2,
          opacity: 0.95,
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "18px",
          width: "150px",
          height: "26px",
          background: "rgba(0,0,0,0.22)",
          borderRadius: "50%",
          filter: "blur(10px)",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "32px",
          width: "170px",
          height: "74px",
          borderRadius: "0 0 90px 90px / 0 0 70px 70px",
          background:
            "linear-gradient(180deg, #c9892b 0%, #a96d1d 45%, #7f4d12 100%)",
          border: "1px solid rgba(255, 210, 125, 0.25)",
          boxShadow:
            "inset 0 10px 18px rgba(255,220,150,0.18), inset 0 -10px 20px rgba(90,40,0,0.28)",
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "86px",
          width: "182px",
          height: "22px",
          borderRadius: "50%",
          background:
            "linear-gradient(180deg, #e0a445 0%, #b97821 55%, #8d5617 100%)",
          border: "1px solid rgba(255, 219, 160, 0.28)",
          zIndex: 2,
          boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "90px",
          width: "138px",
          height: "10px",
          borderRadius: "50%",
          background: "linear-gradient(180deg, #6b4b1f 0%, #3d2810 100%)",
          opacity: 0.7,
          zIndex: 2,
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "58px",
          left: "88px",
          width: "34px",
          height: "10px",
          borderRadius: "50%",
          background: "rgba(255, 224, 163, 0.16)",
          transform: "rotate(-12deg)",
          zIndex: 2,
        }}
      />
    </div>
  );
}
