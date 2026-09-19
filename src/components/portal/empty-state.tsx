interface EmptyStateProps {
  title: string;
  hint?: string;
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="animate-rise py-20 text-center">
      <p className="text-[15px] font-medium">{title}</p>
      {hint ? <p className="text-muted-foreground mt-2 text-[13px]">{hint}</p> : null}
    </div>
  );
}
