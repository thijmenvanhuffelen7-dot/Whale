import Link from "next/link";
import { Logo } from "@/components/site/logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[640px] flex-col items-start justify-center gap-6 px-4">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="display text-[56px]">Niets op de sonar.</h1>
      <p className="text-ink-2">Deze pagina bestaat niet, of de wallet of het token is (nog) niet bekend bij ons.</p>
      <Link href="/" className="text-amber underline">
        Terug naar home
      </Link>
    </div>
  );
}
