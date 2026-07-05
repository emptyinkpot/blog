"use client";

import { useState } from "react";
import ChatPanel from "@/components/ai/ChatPanel";
import ActionButton from "@/components/admin/ActionButton";
import StatusBadge from "@/components/admin/StatusBadge";
import { aiPipeline } from "@/lib/mock-data";

export default function AIPage() {
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState("draft");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "P0 ships a chat-style shell only. Real generation will be wired through token-pool in P2.",
    },
  ]);

  async function generate() {
    if (!topic.trim()) {
      return;
    }

    setStatus("pending");
    setMessages((current) => [...current, { role: "user", content: topic }]);

    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topic, mode: "draft" }),
    });

    const data = await response.json();

    setMessages((current) => [...current, { role: "assistant", content: data.content }]);
    setStatus(data.status || "success");
    setTopic("");
  }

  return (
    <div className="ai-layout">
      <aside className="card section-stack">
        <h2 className="panel-title">Pipeline</h2>
        {aiPipeline.map((step) => (
          <div key={step} className="pipeline-step">{step}</div>
        ))}
      </aside>

      <main className="card chat-shell">
        <div className="chat-shell-header">
          <div>
            <h1>AI Writer</h1>
            <p>P0 ships a chat shell. Generation still returns mock content through route handlers.</p>
          </div>
          <StatusBadge status={status} />
        </div>

        <ChatPanel messages={messages} />

        <div className="chat-input-row">
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Enter a topic for a future article or note"
            className="text-input"
          />
          <ActionButton onClick={generate}>Generate</ActionButton>
        </div>
      </main>

      <aside className="card section-stack">
        <h2 className="panel-title">Metadata</h2>
        <div className="meta-list">
          <div>SEO title: pending</div>
          <div>Description: pending</div>
          <div>Tags: pending</div>
        </div>
        <ActionButton tone="secondary">Save as Draft</ActionButton>
      </aside>
    </div>
  );
}
