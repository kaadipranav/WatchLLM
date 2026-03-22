"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { MagicBentoCard } from "../../components/MagicBentoCard";

type ProjectRow = {
  id: string;
  name: string;
  created_at: string | null;
};

type CreatedProject = {
  project_id: string;
  name: string;
  sdk_key: string;
};

export default function ProjectsPage() {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("Project 1");
  const [error, setError] = useState<string | null>(null);
  const [createdProject, setCreatedProject] = useState<CreatedProject | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.detail || "Failed to load projects");
      }
      setProjects(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const createProject = async () => {
    setBusy(true);
    setError(null);
    setCreatedProject(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.detail || "Failed to create project");
      }

      if (
        typeof payload?.project_id === "string" &&
        typeof payload?.name === "string" &&
        typeof payload?.sdk_key === "string"
      ) {
        setCreatedProject(payload as CreatedProject);
      }

      setName("");
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: "0" }}>
      <div
        style={{
          marginBottom: "40px",
          borderBottom: "1px solid rgba(247,59,0,0.22)",
          paddingBottom: "20px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "42px",
            fontWeight: 800,
            letterSpacing: "0.02em",
            marginBottom: "12px",
            color: "#ffffff",
            textTransform: "uppercase",
          }}
        >
          PROJECTS
        </h1>
        <p
          style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: "12px",
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          CREATE PROJECTS & ISSUE SDK KEYS
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: "20px",
          gridTemplateColumns: "2fr 1fr",
          alignItems: "start",
        }}
      >
        <MagicBentoCard
          style={{
            padding: "24px",
            background: "rgba(247,59,0,0.03)",
            border: "1px solid rgba(247,59,0,0.2)",
            display: "grid",
            gap: "14px",
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono',monospace",
              color: "#6c6c8a",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Create Project
          </div>

          <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "1fr auto" }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name (e.g. Support Agent v1)"
              style={{
                background: "rgba(15,15,35,0.7)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                padding: "10px 12px",
                borderRadius: "4px",
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: "12px",
              }}
            />
            <button
              onClick={createProject}
              disabled={busy || !name.trim()}
              style={{
                border: "1px solid rgba(247,59,0,0.5)",
                background: "rgba(247,59,0,0.16)",
                color: "#ffb39c",
                borderRadius: "4px",
                padding: "10px 18px",
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: busy || !name.trim() ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Creating..." : "Create"}
            </button>
          </div>

          {createdProject ? (
            <div
              style={{
                border: "1px solid rgba(57,217,138,0.35)",
                background: "rgba(57,217,138,0.08)",
                borderRadius: "4px",
                padding: "12px",
                color: "#a9ffd3",
              }}
            >
              <div
                style={{
                  marginBottom: "8px",
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {createdProject.name} created - copy SDK key now (shown once)
              </div>
              <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px", wordBreak: "break-all" }}>
                {createdProject.sdk_key}
              </code>
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
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: "12px",
              }}
            >
              {error}
            </div>
          ) : null}

          <div
            style={{
              borderTop: "1px solid rgba(247,59,0,0.22)",
              paddingTop: "14px",
              display: "grid",
              gap: "8px",
            }}
          >
            <div
              style={{
                color: "#6c6c8a",
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Existing Projects
            </div>
            {loading ? (
              <div style={{ color: "#6c6c8a", fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px" }}>
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <div style={{ color: "#6c6c8a", fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px" }}>
                No projects yet. Create one to generate SDK keys.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "8px" }}>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr",
                      gap: "10px",
                      padding: "10px 12px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "4px",
                      background: "rgba(15,15,35,0.35)",
                    }}
                  >
                    <div style={{ color: "#d9d9e8", fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px" }}>
                      {project.name}
                    </div>
                    <div
                      style={{
                        color: "#6c6c8a",
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: "10px",
                        textAlign: "right",
                      }}
                    >
                      {project.created_at
                        ? new Date(project.created_at).toLocaleString()
                        : "unknown"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </MagicBentoCard>

        <MagicBentoCard
          style={{
            padding: "20px",
            background: "rgba(247,59,0,0.03)",
            border: "1px solid rgba(247,59,0,0.2)",
            display: "grid",
            gap: "12px",
            height: "fit-content",
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono',monospace",
              color: "#6c6c8a",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Project Notes
          </div>
          <div style={{ color: "#8a8a93", fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px", lineHeight: 1.7 }}>
            Every project gets one SDK key. Use it with the Python SDK decorator to register your agent profile.
          </div>
          <div style={{ color: "#8a8a93", fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px", lineHeight: 1.7 }}>
            Once created, generate CI or automation API keys from Settings and scope them to your project SDK key.
          </div>
        </MagicBentoCard>
      </div>
    </div>
  );
}
