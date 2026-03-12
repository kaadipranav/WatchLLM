export default function FailuresPage() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          marginBottom: "1rem",
          /* Cyber-Plasma Liquid Void: neon heading */
          textShadow: "0 0 8px rgba(255, 42, 140, 0.3)",
        }}
      >
        Failures
      </h1>
      <div
        className="glass-panel plasma-border"
        style={{
          padding: "2rem",
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: "0.85rem",
          color: "rgba(255,255,255,0.45)",
        }}
      >
        Failure history across all simulations will appear here.
      </div>
    </div>
  );
}
