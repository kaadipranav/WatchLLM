import { SignUp } from "@clerk/nextjs";

const clerkAppearance = {
  baseTheme: "dark" as const,
  variables: {
    colorPrimary: "#7c6ef7",
    colorTextOnPrimaryBackground: "#ffffff",
    colorBackground: "rgba(13, 13, 26, 0.8)",
    colorInputBackground: "rgba(26, 26, 46, 0.6)",
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#8a8a93",
    colorDanger: "#f5475c",
    colorSuccess: "#39d98a",
    colorWarning: "#ffa600",
    colorNeutral: "#1a1a2e",
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: "13px",
    borderRadius: "4px",
  },
  elements: {
    card: "bg-dark border-neutral rounded-sm shadow-xl",
    headerTitle:
      "font-bold text-base uppercase tracking-wider font-anton text-white",
    headerSubtitle: "text-xs uppercase font-mono tracking-wider text-secondary",
    formFieldLabel:
      "text-xs uppercase font-mono tracking-wider text-secondary font-semibold",
    formFieldInput:
      "bg-neutral border-0 rounded-sm text-sm font-mono placeholder-secondary focus:ring-2 focus:ring-primary",
    formButtonPrimary:
      "bg-primary hover:bg-indigo-500 text-white font-mono text-xs uppercase tracking-widest font-semibold rounded-sm transition-all duration-200 hover:shadow-lg",
    dividerLine: "bg-neutral",
    dividerText: "text-xs uppercase font-mono tracking-wider text-secondary",
    socialButton:
      "border-neutral bg-neutral hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-sm",
    linkButton: "text-indigo-400 hover:text-white font-mono text-xs uppercase",
    alert: "bg-danger/10 border-danger/30 text-danger rounded-sm font-mono text-xs",
  },
};

export default function SignUpPage() {
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
        <SignUp 
          forceRedirectUrl="/dashboard"
          appearance={clerkAppearance}
        />
      </div>
    </div>
  );
}
