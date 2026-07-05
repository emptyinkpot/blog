function PlaceholderRow({ title, detail }) {
  return (
    <div className="placeholder-row">
      <div>
        <div className="placeholder-title">{title}</div>
        <div className="placeholder-detail">{detail}</div>
      </div>
      <span className="status-badge status-warning">pending</span>
    </div>
  );
}

export default function ContentPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Content</h1>
        <p>P0 keeps this page as a control-surface placeholder for future draft and review flows.</p>
      </header>

      <section className="card section-stack">
        <PlaceholderRow title="Draft Queue" detail="Future entry for posts, notes, and project drafts." />
        <PlaceholderRow title="Review Lane" detail="Reserved for human review after AI pipeline output." />
        <PlaceholderRow title="Status Index" detail="Will surface draft / published / archived / ai-generated states." />
      </section>
    </div>
  );
}
