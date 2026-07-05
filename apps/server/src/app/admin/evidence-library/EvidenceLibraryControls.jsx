"use client";

import { useMemo, useState } from "react";

export default function EvidenceLibraryControls({ initialPath, initialQueue, initialManifest }) {
  const [scanPath, setScanPath] = useState(initialPath || "/");
  const [queue, setQueue] = useState(initialQueue || { items: [] });
  const [manifest, setManifest] = useState(initialManifest || { assets: [], clips: [] });
  const [scanResult, setScanResult] = useState(null);
  const [exportResult, setExportResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const queueItems = useMemo(() => queue.items || [], [queue]);
  const recentItems = queueItems.slice(0, 12);

  async function runScan() {
    setIsScanning(true);
    setError("");
    try {
      const response = await fetch("/api/evidence-library/openlist/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: scanPath, perPage: 80, refresh: false, enqueue: true }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Scan HTTP ${response.status}`);
      }
      setScanResult(payload.result);
      if (payload.result.queue) {
        setQueue({ version: "1.0.0", updatedAt: new Date().toISOString(), items: payload.result.queue.items });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsScanning(false);
    }
  }

  async function runExport() {
    setIsExporting(true);
    setError("");
    try {
      const response = await fetch("/api/evidence-library/export/remotion", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Export HTTP ${response.status}`);
      }
      setExportResult(payload.result);
      setManifest(payload.result.manifest);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="card section-stack">
      <div>
        <h2 className="panel-title">Operations</h2>
        <p className="meta-list">扫描 OpenList 会写入待标注队列；导出会生成 Remotion 可读 manifest。</p>
      </div>

      <div className="evidence-control-row">
        <label className="field-stack">
          <span>OpenList path</span>
          <input className="text-input" value={scanPath} onChange={(event) => setScanPath(event.target.value)} />
        </label>
        <button className="action-button action-button-primary" type="button" onClick={runScan} disabled={isScanning}>
          {isScanning ? "Scanning..." : "Scan and enqueue"}
        </button>
        <button className="action-button action-button-secondary" type="button" onClick={runExport} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Export Remotion manifest"}
        </button>
      </div>

      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className="metric-grid">
        <div className="metric-card card">
          <div className="metric-label">Unlabeled queue</div>
          <div className="metric-value">{queueItems.length}</div>
        </div>
        <div className="metric-card card">
          <div className="metric-label">Remotion assets</div>
          <div className="metric-value">{manifest.assets?.length || 0}</div>
        </div>
        <div className="metric-card card">
          <div className="metric-label">Remotion clips</div>
          <div className="metric-value">{manifest.clips?.length || 0}</div>
        </div>
      </div>

      {scanResult?.queue ? (
        <div className="meta-grid">
          <span>Scan path</span>
          <code>{scanResult.scan.path}</code>
          <span>Files added</span>
          <code>{scanResult.queue.added}</code>
          <span>Files updated</span>
          <code>{scanResult.queue.updated}</code>
        </div>
      ) : null}

      {exportResult ? (
        <div className="meta-grid">
          <span>Export path</span>
          <code>{exportResult.path}</code>
          <span>Generated</span>
          <code>{exportResult.manifest.generatedAt}</code>
        </div>
      ) : null}

      <div className="table-shell">
        <table className="provider-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>OpenList path</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentItems.length ? (
              recentItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.detectedAssetType}</td>
                  <td className="mono-cell">{item.openlistPath}</td>
                  <td>{item.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">No scanned files yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
