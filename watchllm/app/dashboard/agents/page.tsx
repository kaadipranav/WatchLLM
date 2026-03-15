export default function AgentsPage() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          marginBottom: "1rem",
          /* Cyber-Plasma Liquid Void: neon heading */
          textShadow: "0 0 8px rgba(0, 240, 255, 0.3)",
        }}
      >
        Agents
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
        Connected agents will appear here once configured.
      </div>
    </div>
  );
}
