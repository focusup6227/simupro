import Link from "next/link";
import AppLogo from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function LegalPageShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-background">
      <header className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Back to home">
          <AppLogo />
        </Link>
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Home
          </Link>
        </Button>
      </header>

      <main className="flex-1">
        <article className="container mx-auto max-w-3xl px-3 py-8 sm:px-4 sm:py-14 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          <div className="legal-content mt-8 space-y-6 text-base leading-relaxed text-foreground/90">
            {children}
          </div>
        </article>
      </main>

      <footer className="border-t bg-muted">
        <div className="container mx-auto flex flex-col gap-2 px-4 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:gap-4 sm:text-left lg:px-8">
          <p>&copy; {new Date().getFullYear()} SimuPro. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-end">
            <Link href="/privacy" className="inline-block py-1.5 hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="inline-block py-1.5 hover:text-foreground">Terms</Link>
            <Link href="/refund-policy" className="inline-block py-1.5 hover:text-foreground">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-foreground/80">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-6 text-foreground/80 marker:text-muted-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
