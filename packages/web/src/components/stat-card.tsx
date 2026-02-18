"use client";

export function StatCard({
  label,
  value,
  sub,
  color = "text-oracle-accent",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="p-3.5 rounded-xl bg-oracle-surface1 border border-oracle-border flex-1 min-w-[140px]">
      <div className="text-[10px] text-oracle-text-dim font-mono tracking-widest mb-1">
        {label}
      </div>
      <div className={`text-xl font-extrabold font-mono ${color}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-oracle-text-muted font-mono mt-0.5">
          {sub}
        </div>
      )}
    </div>
  );
}
