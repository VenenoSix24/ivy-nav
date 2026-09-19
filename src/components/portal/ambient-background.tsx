export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-[18vw] -left-[18vw] size-[48vw] rounded-full bg-[var(--ambient-a)] opacity-[var(--ambient-opacity)] blur-[80px]" />
      <div className="absolute top-[20vh] -right-[18vw] size-[48vw] rounded-full bg-[var(--ambient-b)] opacity-[var(--ambient-opacity)] blur-[80px]" />
    </div>
  );
}
