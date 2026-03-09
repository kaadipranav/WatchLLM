export default function FailuresPage() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          marginBottom: "1rem",
        }}
      >
        Failures
      </h1>
      <div
        style={{
          backgroundColor: "#0a0a0a",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "0.75rem",
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
