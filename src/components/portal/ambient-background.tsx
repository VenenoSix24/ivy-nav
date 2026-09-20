/**
 * 环境光：两团模糊色斑 + 一层极细噪点。整套只有两个动画，都是合成层的 transform：
 * 父层随滚动轻微上移（`ambient-layer`），两团光斑各自慢慢漂移与胀缩（`ambient-blob-*`）。
 * 不滚动时它就在呼吸，滚动时多一层视差（设计文档 §47 的 Calm / Subtle motion）。
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="ambient-layer absolute inset-0">
        <div className="ambient-blob ambient-blob-a absolute -top-[18vw] -left-[18vw] size-[48vw] rounded-full bg-[var(--ambient-a)] opacity-[var(--ambient-opacity)] blur-[80px]" />
        <div className="ambient-blob ambient-blob-b absolute top-[20vh] -right-[18vw] size-[48vw] rounded-full bg-[var(--ambient-b)] opacity-[var(--ambient-opacity)] blur-[80px]" />
      </div>
      {/* 噪点垫在内容之下：它负责给背景一点颗粒，不参与任何交互 */}
      <div className="ambient-grain absolute inset-0" />
    </div>
  );
}
