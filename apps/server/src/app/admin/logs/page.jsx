import LogPanel from "@/components/admin/LogPanel";
import { publishLogText, errorHistory } from "@/lib/mock-data";

export default function LogsPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Logs</h1>
        <p>P0 keeps logs read-only and mock-backed so the control surface can settle before live wiring.</p>
      </header>

      <section className="two-column-grid">
        <LogPanel title="Publish Log" lines={publishLogText} />
        <LogPanel title="Errors" lines={errorHistory} tone="danger" />
      </section>
    </div>
  );
}
