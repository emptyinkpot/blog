export default function LogPanel({ title, lines, tone = "neutral" }) {
  return (
    <section className="card panel-block">
      <h2 className="panel-title">{title}</h2>
      <div className={`log-lines log-lines-${tone}`}>
        {Array.isArray(lines)
          ? lines.map((line) => <div key={line}>{line}</div>)
          : <pre>{lines}</pre>}
      </div>
    </section>
  );
}
