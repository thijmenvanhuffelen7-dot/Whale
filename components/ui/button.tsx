import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-ctl)] font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out-expo)] active:translate-y-px disabled:pointer-events-none disabled:opacity-45";
const variants: Record<Variant, string> = {
  primary: "bg-amber text-amber-ink hover:bg-[#ffc46b]",
  ghost: "border border-line-strong text-ink hover:border-ink-3 hover:bg-surface-2",
  subtle: "text-ink-2 hover:text-ink hover:bg-surface-2",
  danger: "border border-sell/40 text-sell hover:bg-sell/10",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  external,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> & { href: string; variant?: Variant; size?: Size; external?: boolean }) {
  const cls = buttonClass(variant, size, className);
  if (external) return <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...(props as object)} />;
  return <Link href={href} className={cls} {...props} />;
}
