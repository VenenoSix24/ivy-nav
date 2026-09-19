interface BrandMarkProps {
  className?: string;
}

/** 站点标记：与 app/icon.svg 同一形状，作为顶栏与页脚的品牌符号。 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="7.5" className="fill-primary" />
      <path
        d="M16 7.5c4.6 3.9 6.8 7.6 6.8 11.1a6.8 6.8 0 1 1-13.6 0C9.2 15.1 11.4 11.4 16 7.5Z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}
