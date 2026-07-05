import StatusBadge from "@/components/admin/StatusBadge";
import { evidencePaths, readEvidenceManifest, readEvidencePlan, readUnlabeledQueue } from "@/lib/evidence-library";
import EvidenceLibraryControls from "./EvidenceLibraryControls";

export default function EvidenceLibraryPage() {
  const plan = readEvidencePlan();
  const manifest = readEvidenceManifest();
  const queue = readUnlabeledQueue();
  const paths = evidencePaths();
  const assets = manifest.assets || [];
  const clips = manifest.clips || [];

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Evidence Library</h1>
        <p>史料素材库控制面。MyBlog 管元数据和标注，OpenList 管大文件，Remotion 读取导出的 manifest。</p>
      </header>

      <section className="metric-grid">
        <div className="metric-card card">
          <div className="metric-label">Plan status</div>
          <div className="metric-value">{plan.status || "unknown"}</div>
        </div>
        <div className="metric-card card">
          <div className="metric-label">Assets</div>
          <div className="metric-value">{assets.length}</div>
        </div>
        <div className="metric-card card">
          <div className="metric-label">Clips</div>
          <div className="metric-value">{clips.length}</div>
        </div>
      </section>

      <section className="two-column-grid">
        <article className="card section-stack">
          <div>
            <h2 className="panel-title">OpenList</h2>
            <p className="meta-list">当前后台通过 OpenList API 扫描文件，但不会把文件名当作素材语义。</p>
          </div>
          <div className="meta-grid">
            <span>Base URL</span>
            <code>{plan.actors?.openlist?.baseUrl}</code>
            <span>Mounts</span>
            <code>{(plan.actors?.openlist?.activeMounts || []).join(", ")}</code>
            <span>List API</span>
            <code>{plan.actors?.openlist?.apis?.list}</code>
          </div>
        </article>

        <article className="card section-stack">
          <div>
            <h2 className="panel-title">Hard Rules</h2>
            <p className="meta-list">证据优先，不造假文档、假肖像、假历史照片。</p>
          </div>
          <div className="badge-grid">
            {Object.entries(plan.hardRules || {}).map(([rule, enabled]) => (
              <span key={rule} className="evidence-rule-chip">
                <StatusBadge status={enabled ? "success" : "disabled"} />
                <span>{rule}</span>
              </span>
            ))}
          </div>
        </article>
      </section>

      <EvidenceLibraryControls
        initialPath={plan.actors?.openlist?.activeMounts?.[0] || "/"}
        initialQueue={queue}
        initialManifest={manifest}
      />

      <section className="card section-stack">
        <div>
          <h2 className="panel-title">Workflow</h2>
          <p className="meta-list">下一步要把扫描队列、人工标注、clip 切分和 Remotion 导出串起来。</p>
        </div>
        <div className="evidence-admin-steps">
          {(plan.workflow || []).map((step, index) => (
            <article key={step.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step.title}</h3>
                <p>Input: {step.input}</p>
                <p>Output: {step.output}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card section-stack">
        <div>
          <h2 className="panel-title">Current Manifest</h2>
          <p className="meta-list">当前 manifest 还没有正式素材，后续 OpenList 扫描结果会进入待标注队列。</p>
        </div>
        <div className="meta-grid">
          <span>Data root</span>
          <code>{paths.dataRoot}</code>
          <span>Manifest</span>
          <code>{paths.manifestPath}</code>
          <span>Queue</span>
          <code>{paths.queuePath}</code>
          <span>Remotion export</span>
          <code>{paths.remotionExportPath}</code>
          <span>Version</span>
          <code>{manifest.version}</code>
        </div>
      </section>
    </div>
  );
}
