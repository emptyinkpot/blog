import StatusBadge from "@/components/admin/StatusBadge";

export default function ProviderTable({ providers }) {
  return (
    <div className="table-shell">
      <table className="provider-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Status</th>
            <th>Success Rate</th>
            <th>Latency</th>
            <th>Cost</th>
            <th>Fail Count</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((provider) => (
            <tr key={provider.name}>
              <td className="mono-cell">{provider.name}</td>
              <td><StatusBadge status={provider.status} /></td>
              <td>{provider.successRate}</td>
              <td>{provider.latency}</td>
              <td>{provider.cost}</td>
              <td>{provider.failCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
