import { MetricCard } from "./MetricCard";

export function MetricGrid({ items, className = "" }) {
  return (
    <section className={`metric-strip ${className}`.trim()}>
      {items.map((item) => (
        <MetricCard
          key={item.label}
          icon={item.icon}
          label={item.label}
          value={item.value}
          tone={item.tone}
        />
      ))}
    </section>
  );
}
