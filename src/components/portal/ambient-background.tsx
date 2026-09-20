/**
 * 环境光：两团模糊色斑 + 一层极细噪点。整套只有两个动画，都是合成层的 transform：
 * 父层随滚动轻微上移（`ambient-layer`），两团光斑各自慢慢漂移与胀缩（`ambient-blob-*`）。
 * 不滚动时它就在呼吸，滚动时多一层视差（设计文档 §47 的 Calm / Subtle motion）。
 *
 * 底色画在这一层、而不是只画在 body 上，是为 iOS 26 的 Safari：那一版起浏览器底色由它
 * 自己「找」—— 扫视口边缘的 fixed / sticky 元素、读它们的 background-color 当底色。
 * 一层全透明的 fixed 元素会被读成「没有颜色」，Safari 便回落到自己那层白，悬浮工具栏
 * 下面就有了那条白灰带。这一层铺满屏幕、本来正压在底边上，颜色又正好是页面底色，让它
 * 把这颜色带上，就等于给了 Safari 一个正确答案。`-z-10` 是配套的：有了底色之后它得
 * 老实待在内容下面（父级都自带层叠上下文，所以不会掉到画布之外）。
 */
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
      {/* 噪点垫在内容之下：它负责给背景一点颗粒，不参与任何交互 */}
      <div className="ambient-grain absolute inset-0" />
    </div>
  );
}
