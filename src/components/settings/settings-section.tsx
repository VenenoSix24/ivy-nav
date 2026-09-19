import { cn } from "cn";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({ title, description, children, className }: SettingsSectionProps) {
  return (
    <section className={cn("surface rounded-2xl p-6", className)}>
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold tracking-[-0.015em]">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
