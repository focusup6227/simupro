"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppLogo from '@/components/app-logo';
import { useSupabase } from '@/supabase/provider';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Authentication service not available. Please try again later.",
      });
      return;
    }
    setIsLoading(true);
    setShowResend(false);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push('/dashboard');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "An unexpected error occurred.";
      const isUnverified = /confirm|verify|email.*not.*confirmed/i.test(msg);
      if (isUnverified) {
        setShowResend(true);
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!supabase || !email) return;
    setIsResending(true);
    try {
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_ORIGIN ?? '';
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });
      if (error) throw error;
      toast({ title: 'Verification email sent', description: `Check ${email} for the link.` });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not resend',
        description: e instanceof Error ? e.message : 'Please try again.',
      });
    } finally {
      setIsResending(false);
    }
  };



  return (
    <main className="flex items-center justify-center min-h-screen p-4" style={{ background: '#04102b' }}>
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 mb-2">
            <AppLogo />
          </Link>
          <p className="text-[11px] uppercase tracking-[0.22em] font-mono mt-2" style={{ color: 'rgba(143,220,246,0.7)' }}>
            EMS Simulation &amp; Training
          </p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: '#0b1f44', border: '1px solid #1c305e' }}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
            <p className="text-sm mt-1" style={{ color: '#8595c0' }}>Enter your credentials to access your training</p>
          </div>

          <div className="space-y-5">
            {!supabase && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Supabase is not configured in this environment</AlertTitle>
                <AlertDescription>
                  Add <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>, then restart{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run dev</code>.
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium" style={{ color: '#8595c0' }}>Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium" style={{ color: '#8595c0' }}>Password</Label>
                  <Link href="/forgot-password" className="text-xs hover:text-white transition" style={{ color: '#3fb8e5' }}>
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button
                type="submit"
                className="w-full min-h-11 font-semibold"
                size="lg"
                disabled={isLoading}
                style={{ background: 'linear-gradient(180deg, #ff8a32 0%, #ff6a10 100%)', color: '#1a0d02', border: 'none' }}
              >
                {isLoading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
            {showResend && (
              <div className="rounded-lg border p-3 text-sm" style={{ borderColor: 'rgba(245,185,94,0.4)', background: 'rgba(245,185,94,0.06)', color: '#f5b95e' }}>
                <p>Looks like your email isn&apos;t verified yet.</p>
                <button
                  type="button"
                  className="mt-1 font-medium underline underline-offset-4 disabled:opacity-50"
                  onClick={() => void handleResendVerification()}
                  disabled={isResending}
                >
                  {isResending ? 'Sending…' : 'Resend verification email'}
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-sm" style={{ color: '#8595c0' }}>
            No account?{' '}
            <Link href="/signup" className="font-medium text-white hover:underline">
              Sign up free
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] font-mono" style={{ color: 'rgba(143,220,246,0.35)' }}>
          Training only · Not medical advice · Not clinical decision support
        </p>
      </div>
    </main>
  );
}
