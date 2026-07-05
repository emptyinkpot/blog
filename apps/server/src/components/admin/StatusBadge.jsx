export default function StatusBadge({ status }) {
  const tone =
    status === "healthy" || status === "success"
      ? "status-success"
      : status === "cooldown" || status === "pending" || status === "draft"
        ? "status-warning"
        : status === "failed" || status === "error"
          ? "status-danger"
          : "status-neutral";

  return <span className={`status-badge ${tone}`}>{status}</span>;
}
