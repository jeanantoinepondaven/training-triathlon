// Placeholder in the shape of the week while data loads (no spinner).
export default function Loading() {
  const block = (h: number, r = 24) => <div style={{ height: h, borderRadius: r, background: "var(--bg-cell)", opacity: 0.7 }} />;
  return (
    <div className="content" aria-busy="true" aria-label="Loading">
      <div className="hig-nav-large lt">
        <div style={{ width: 160, height: 34, borderRadius: 10, background: "var(--fill-tertiary)" }} />
      </div>
      <div className="hig-body">
        {block(34, 999)}
        {block(150)}
        {block(130)}
        {block(130)}
      </div>
    </div>
  );
}
