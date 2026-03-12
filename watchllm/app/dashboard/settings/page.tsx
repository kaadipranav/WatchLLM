export default function SettingsPage() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          marginBottom: "1rem",
          /* Cyber-Plasma Liquid Void: neon heading */
          textShadow: "0 0 8px rgba(110, 0, 255, 0.3)",
        }}
      >
        Settings
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
        Account, API keys, and notification preferences.
      </div>
    </div>
  );
}
