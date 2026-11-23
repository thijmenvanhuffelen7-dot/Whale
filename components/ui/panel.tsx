import { cn } from "@/lib/cn";

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-[var(--radius-panel)] border border-line bg-surface", className)}>
      {(title || action) && (
        <header className="flex min-h-12 items-center justify-between gap-4 border-b border-line px-4 sm:px-5">
          {title && <h2 className="text-[13px] font-medium tracking-wide text-ink-2">{title}</h2>}
          {action}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Empty({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 py-6">
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {children && <p className="max-w-[52ch] text-sm text-ink-2">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-ink-3">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-[var(--radius-ctl)] border border-line-strong bg-bg px-3 text-sm text-ink placeholder:text-ink-3 transition-colors hover:border-ink-3 focus:border-amber focus:outline-none";
