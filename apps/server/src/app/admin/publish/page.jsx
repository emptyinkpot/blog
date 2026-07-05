"use client";

import { useState } from "react";
import ActionButton from "@/components/admin/ActionButton";
import LogPanel from "@/components/admin/LogPanel";
import StateTimeline from "@/components/publish/StateTimeline";
import { publishSteps, publishLogText } from "@/lib/mock-data";

export default function PublishPage() {
  const [state, setState] = useState("idle");

  async function triggerRelease() {
    setState("checking");
    const response = await fetch("/api/publish/release", { method: "POST" });
    const data = await response.json();
    setState(data.ok ? "success" : "failed");
  }

  async function triggerRollback() {
    setState("rollbacking");
    const response = await fetch("/api/publish/rollback", { method: "POST" });
    const data = await response.json();
    setState(data.ok ? "rollbacked" : "failed");
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Publish Center</h1>
        <p>Build, release, health check, and rollback console.</p>
      </header>

      <section className="card publish-status-card">
        <div className="metric-label">Current State</div>
        <div className="metric-value">{state}</div>
      </section>

      <StateTimeline steps={publishSteps} state={state} />

      <section className="button-row">
        <ActionButton onClick={triggerRelease}>Release</ActionButton>
        <ActionButton tone="danger" onClick={triggerRollback}>Rollback</ActionButton>
      </section>

      <LogPanel title="Publish Log" lines={publishLogText} />
    </div>
  );
}
