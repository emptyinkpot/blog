export default function StateTimeline({ steps, state }) {
  return (
    <section className="timeline-grid">
      {steps.map((step) => {
        const active = step === state || state === "success";
        return (
          <div key={step} className={`timeline-step ${active ? "timeline-step-active" : ""}`}>
            {step}
          </div>
        );
      })}
    </section>
  );
}
