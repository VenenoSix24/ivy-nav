/** 环境光：两团模糊色斑 + 一层极细噪点。
 *  这一层铺满屏幕且带页面底色，是给 iOS Safari 取浏览器底色用的，不能去掉。 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="bg-background pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="ambient-layer absolute inset-0">
        <div className="ambient-blob ambient-blob-a absolute -top-[18vw] -left-[18vw] size-[48vw] rounded-full bg-[var(--ambient-a)] opacity-[var(--ambient-opacity)] blur-[80px]" />
        <div className="ambient-blob ambient-blob-b absolute top-[20vh] -right-[18vw] size-[48vw] rounded-full bg-[var(--ambient-b)] opacity-[var(--ambient-opacity)] blur-[80px]" />
      </div>
      <div className="ambient-grain absolute inset-0" />
    </div>
  );
}
