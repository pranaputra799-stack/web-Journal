import Link from "next/link";

// Shared primitives. Kept small on purpose: the ledger look comes from
// borders, type and spacing rather than from a component library.

export function PageHeader({
  title,
  lead,
  action,
}: {
  title: string;
  lead?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="border-b border-line px-3 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl leading-tight font-medium tracking-tight">{title}</h1>
          {lead && <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed">{lead}</p>}
        </div>
        {action && <div className="w-full sm:w-auto shrink-0">{action}</div>}
      </div>
    </header>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`panel-surface overflow-hidden ${className}`}>{children}</section>;
}

export function PanelHead({
  title,
  note,
}: {
  title: string;
  note?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/60 px-4 py-3 bg-raised/20">
      <h2 className="text-sm font-semibold tracking-tight text-paper">{title}</h2>
      {note && <span className="num text-xs text-muted font-normal">{note}</span>}
    </div>
  );
}

export function Empty({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-lg">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{hint}</p>
      {action && (
        <Link
          href={action.href}
          className="num mt-5 inline-block border border-brass px-3 py-2 text-sm text-brass"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

// Percentages below the sample threshold get this tag so nobody reads noise
// as a trend.
export function SmallSampleTag() {
  return (
    <span
      title="Jumlah trade masih di bawah 30, angka ini belum bisa dipercaya."
      className="num border border-line px-1.5 py-0.5 text-[10px] text-muted rounded-[2px]"
    >
      sampel kecil
    </span>
  );
}

export function Metric({
  label,
  value,
  tone = "paper",
  note,
  small,
  className = "",
}: {
  label: string;
  value: string;
  tone?: "paper" | "profit" | "loss" | "flat" | "brass";
  note?: string;
  small?: boolean;
  className?: string;
}) {
  const toneClass =
    tone === "profit"
      ? "text-profit font-semibold"
      : tone === "loss"
        ? "text-loss font-semibold"
        : tone === "brass"
          ? "text-brass font-semibold"
          : tone === "flat"
            ? "text-flat"
            : "text-paper font-semibold";

  return (
    <div className={`group rounded p-1 transition-colors hover:bg-raised/35 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="num text-[11px] text-muted uppercase tracking-wider font-medium">{label}</span>
        {small && <SmallSampleTag />}
      </div>
      <div className={`num mt-1.5 text-xl tracking-tight transition-transform duration-150 group-hover:translate-x-0.5 ${toneClass}`}>{value}</div>
      {note && <div className="num mt-1 text-[11px] text-muted/80">{note}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="num text-[11px] text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
