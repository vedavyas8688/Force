export function DashboardCard({ children, className = "" }) {
  return (
    <section
      className={`rounded-app border border-app-border bg-app-surface shadow-card ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="m-0 text-lg font-bold text-app-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-app-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
