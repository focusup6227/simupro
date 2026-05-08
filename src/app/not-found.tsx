import Link from "next/link";
import { Button } from "@/components/ui/button";
import AppLogo from "@/components/app-logo";
import { ArrowRight, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-center">
      <div className="mb-8">
        <AppLogo />
      </div>
      <p className="font-mono text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Error 404
      </p>
      <h1 className="mt-3 text-5xl font-bold tracking-tight sm:text-6xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-balance text-muted-foreground">
        The page you were looking for has either moved, been removed, or never
        existed in the first place.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to home
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/dashboard/scenarios">
            <Search className="mr-2 h-4 w-4" />
            Browse scenarios
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
