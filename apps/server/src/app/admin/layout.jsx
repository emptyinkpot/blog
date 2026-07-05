const nav = [
  ["Dashboard", "/admin/dashboard"],
  ["Content", "/admin/content"],
  ["Evidence Library", "/admin/evidence-library"],
  ["AI Writer", "/admin/ai"],
  ["Publish", "/admin/publish"],
  ["Token Pool", "/admin/token-pool"],
  ["Logs", "/admin/logs"],
];

export default function AdminLayout({ children }) {
  return (
    <div className="console-shell">
      <aside className="console-sidebar">
        <div className="brand-block">
          <div className="brand-title">MyBlog Admin</div>
          <div className="brand-caption">Content platform control plane prototype</div>
        </div>

        <nav className="nav-list">
          {nav.map(([label, href]) => (
            <a key={href} href={href} className="nav-link">
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="console-main">{children}</main>
    </div>
  );
}
