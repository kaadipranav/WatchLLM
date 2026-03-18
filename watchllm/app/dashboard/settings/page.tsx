"use client";

import { useEffect, useState } from "react";
import { MagicBentoCard } from "../../components/MagicBentoCard";

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  project_sdk_key: string | null;
  created_at: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  active: boolean;
};

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("CI Key");
  const [sdkKey, setSdkKey] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("90");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/keys");
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.detail || "Failed to load API keys");
      }
      const payload = await res.json();
      const rows = Array.isArray(payload?.keys) ? payload.keys : [];
      setKeys(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    setCreatedKey(null);
    try {
      const parsedDays = Number(expiresInDays);
      const expiresValue = Number.isFinite(parsedDays) && parsedDays > 0 ? Math.round(parsedDays) : null;

      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sdk_key: sdkKey,
          expires_in_days: expiresValue,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.detail || "Failed to create API key");
      }

      if (typeof payload?.api_key === "string") {
        setCreatedKey(payload.api_key);
      }

      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.detail || "Failed to revoke API key");
      }
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke API key");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: "0" }}>
      <div style={{ marginBottom: "40px", borderBottom: "1px solid #1a1a2e", paddingBottom: "20px" }}>
        <h1
          style={{
            fontFamily: "'Manrope',sans-serif",
            fontSize: "42px",
            fontWeight: 800,
            letterSpacing: "0.02em",
            marginBottom: "12px",
            color: "#ffffff",
            textTransform: "uppercase",
          }}
        >
          SETTINGS
        </h1>
        <p
          style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: "12px",
            color: "#4a4a6a",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          ACCOUNT, API KEYS & PREFERENCES
        </p>
      </div>

      <MagicBentoCard
        style={{
          padding: "24px",
          fontFamily: "'IBM Plex Mono',monospace",
          fontSize: "13px",
          color: "#8a8a93",
          background: "rgba(124,110,247,0.02)",
          border: "1px solid rgba(124,110,247,0.1)",
          display: "grid",
          gap: "16px",
          letterSpacing: "0.02em",
          lineHeight: 1.6,
        }}
      >
        <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "2fr 2fr 1fr auto" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key Name"
            style={{
              background: "rgba(15,15,35,0.7)",
              border: "1px solid #1a1a2e",
              color: "#fff",
              padding: "10px 12px",
              borderRadius: "4px",
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: "12px",
            }}
          />
          <input
            value={sdkKey}
            onChange={(e) => setSdkKey(e.target.value)}
            placeholder="Project SDK Key (sk_proj_...)"
            style={{
              background: "rgba(15,15,35,0.7)",
              border: "1px solid #1a1a2e",
              color: "#fff",
              padding: "10px 12px",
              borderRadius: "4px",
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: "12px",
            }}
          />
          <input
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            placeholder="Expiry days"
            style={{
              background: "rgba(15,15,35,0.7)",
              border: "1px solid #1a1a2e",
              color: "#fff",
              padding: "10px 12px",
              borderRadius: "4px",
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: "12px",
            }}
          />
          <button
            onClick={handleCreate}
            disabled={busy || !name.trim() || !sdkKey.trim()}
            style={{
              border: "1px solid rgba(124,110,247,0.5)",
              background: "rgba(124,110,247,0.15)",
              color: "#c4b6ff",
              borderRadius: "4px",
              padding: "10px 14px",
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Working..." : "Create Key"}
          </button>
        </div>

        {createdKey ? (
          <div
            style={{
              border: "1px solid rgba(57,217,138,0.35)",
              background: "rgba(57,217,138,0.08)",
              borderRadius: "4px",
              padding: "12px",
              color: "#a9ffd3",
            }}
          >
            <div style={{ marginBottom: "8px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Copy Now - this key is shown once
            </div>
            <code style={{ fontSize: "12px", wordBreak: "break-all" }}>{createdKey}</code>
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              border: "1px solid rgba(245,71,92,0.35)",
              background: "rgba(245,71,92,0.08)",
              borderRadius: "4px",
              padding: "10px 12px",
              color: "#ff8c98",
              fontSize: "12px",
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ borderTop: "1px solid #1a1a2e", paddingTop: "14px" }}>
          <div
            style={{
              color: "#6c6c8a",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "10px",
            }}
          >
            Existing API Keys
          </div>

          {loading ? (
            <div style={{ fontSize: "12px", color: "#6c6c8a" }}>Loading keys...</div>
          ) : keys.length === 0 ? (
            <div style={{ fontSize: "12px", color: "#6c6c8a" }}>No API keys created yet.</div>
          ) : (
            <div style={{ display: "grid", gap: "8px" }}>
              {keys.map((key) => (
                <div
                  key={key.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 2fr 1.5fr auto",
                    gap: "10px",
                    alignItems: "center",
                    padding: "10px 12px",
                    border: "1px solid #1a1a2e",
                    borderRadius: "4px",
                    background: "rgba(15,15,35,0.35)",
                  }}
                >
                  <div>
                    <div style={{ color: "#d9d9e8", fontSize: "12px" }}>{key.name}</div>
                    <div style={{ color: "#6c6c8a", fontSize: "10px" }}>{key.key_prefix}</div>
                  </div>
                  <div style={{ color: "#8a8aa3", fontSize: "11px" }}>
                    {key.project_sdk_key || "No project"}
                  </div>
                  <div style={{ color: "#6c6c8a", fontSize: "10px" }}>
                    {key.last_used_at ? `Last used ${new Date(key.last_used_at).toLocaleString()}` : "Never used"}
                  </div>
                  <button
                    onClick={() => handleRevoke(key.id)}
                    disabled={busy || !key.active}
                    style={{
                      border: "1px solid rgba(245,71,92,0.45)",
                      background: key.active ? "rgba(245,71,92,0.14)" : "rgba(255,255,255,0.04)",
                      color: key.active ? "#ff8c98" : "#66667a",
                      borderRadius: "4px",
                      padding: "8px 10px",
                      fontFamily: "'IBM Plex Mono',monospace",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      cursor: busy || !key.active ? "not-allowed" : "pointer",
                    }}
                  >
                    {key.active ? "Revoke" : "Revoked"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </MagicBentoCard>
    </div>
  );
}
