"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SimulationProgressView } from "../../../dashboard/components/SimulationProgressView";
import { Sidebar } from "../../dashboard/Sidebar";

export default function SimulatePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : null;

  const [checking, setChecking] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      router.replace("/dashboard");
      return;
    }

    // Verify the simulation exists and the user can access it
    fetch(`/api/simulation/${id}/status`)
      .then(async (res) => {
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          setNotFound(true);
        }
        setChecking(false);
      })
      .catch(() => {
        setNotFound(true);
        setChecking(false);
      });
  }, [id, router]);

  // Redirect if not found or no id
  useEffect(() => {
    if (notFound) {
      router.replace("/dashboard");
    }
  }, [notFound, router]);

  if (!id || checking) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          background: "#07070f",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'IBM Plex Mono',monospace",
          fontSize: "12px",
          color: "#4a4a6a",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Loading simulation...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#07070f",
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          padding: "40px 48px",
          overflowY: "auto",
          maxWidth: "calc(100vw - 240px)",
        }}
      >
        <div
          style={{
            marginBottom: "32px",
            borderBottom: "1px solid #1a1a2e",
            paddingBottom: "20px",
          }}
        >
          <h1
            style={{
              fontFamily: "'Manrope',sans-serif",
              fontSize: "42px",
              fontWeight: 800,
              letterSpacing: "0.02em",
              marginBottom: "8px",
              color: "#ffffff",
              textTransform: "uppercase",
            }}
          >
            SIMULATION
          </h1>
          <p
            style={{
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: "11px",
              color: "#4a4a6a",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {id}
          </p>
        </div>

        <SimulationProgressView simulationId={id} />
      </main>
    </div>
  );
}
