// Skeleton in the shape of the week, no spinner (design system: Loading state).
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="td-skel" style={{ height: 48, borderRadius: 999 }} />
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="td-skel" style={{ height: 104, borderRadius: 12 }} />
        ))}
      </div>
      <div className="td-skel" style={{ height: 220, borderRadius: 28 }} />
      <div className="td-skel" style={{ height: 88 }} />
      <div className="td-skel" style={{ height: 88 }} />
    </div>
  );
}
