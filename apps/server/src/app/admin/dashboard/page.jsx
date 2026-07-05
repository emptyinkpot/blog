import MetricCard from "@/components/admin/MetricCard";
import LogPanel from "@/components/admin/LogPanel";
import { dashboardCards, releaseHistory, errorHistory } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>MyBlog content platform control console prototype</p>
      </header>

      <section className="metric-grid">
        {dashboardCards.map(([label, value]) => (
          <MetricCard key={label} label={label} value={value} />
        ))}
      </section>

      <section className="two-column-grid">
        <LogPanel title="Recent Releases" lines={releaseHistory} />
        <LogPanel title="Recent Errors" lines={errorHistory} tone="danger" />
      </section>
    </div>
  );
}
