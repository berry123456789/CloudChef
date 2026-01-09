import { classNames } from "../lib/utils.js";

export function Card({ title, children, right }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={classNames(
        "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
        "focus:outline-none focus:ring-2 focus:ring-emerald-500/40",
        props.className
      )}
    />
  );
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={classNames(
        "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
        "focus:outline-none focus:ring-2 focus:ring-emerald-500/40",
        props.className
      )}
    />
  );
}

export function Button({ children, variant = "primary", disabled, className, ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "secondary"
      ? "bg-white/10 text-slate-100 hover:bg-white/15"
      : "bg-emerald-500 text-slate-950 hover:bg-emerald-400";

  return (
    <button {...props} disabled={disabled} className={classNames(base, styles, className)}>
      {children}
    </button>
  );
}

export function StatusPill({ loading }) {
  if (!loading) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200">
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      Loading…
    </div>
  );
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
      {error}
    </div>
  );
}
