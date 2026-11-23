import Link from "next/link";
import { Logo } from "@/components/site/logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[640px] flex-col items-start justify-center gap-6 px-4">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="display text-[56px]">Nothing on the sonar.</h1>
      <p className="text-ink-2">This page doesn’t exist, or we don’t know this wallet or token (yet).</p>
      <Link href="/" className="text-amber underline">
        Back to home
      </Link>
    </div>
  );
}
