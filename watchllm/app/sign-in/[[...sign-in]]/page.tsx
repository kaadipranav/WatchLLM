import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #080810 0%, #0d0d1a 50%, #080810 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle radial glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "600px",
          background: "radial-gradient(ellipse, rgba(124,110,247,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      
      <div style={{ position: "relative", zIndex: 1 }}>
        <SignIn forceRedirectUrl="/dashboard" />
      </div>
    </div>
  );
}
