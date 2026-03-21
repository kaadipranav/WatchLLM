"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { SimulationProgressView } from "../../../dashboard/components/SimulationProgressView";
import { Sidebar } from "../../dashboard/Sidebar";

export default function SimulatePage() {
  const { getToken } = useAuth();
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

    const checkStatus = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/simulation/${id}/status`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setChecking(false);
      }
    };
    
    checkStatus();
  }, [id, router, getToken]);

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
          background: "#050506",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'IBM Plex Mono',monospace",
          fontSize: "12px",
          color: "var(--text-muted)",
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
        background:
          "radial-gradient(circle at 50% 0%, rgba(247,59,0,0.06), transparent 40%), #050506",
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
              color: "var(--text-muted)",
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
