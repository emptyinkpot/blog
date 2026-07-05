export default function ActionButton({ children, tone = "primary", ...props }) {
  return (
    <button className={`action-button action-button-${tone}`} {...props}>
      {children}
    </button>
  );
}
