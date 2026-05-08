"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-4">
            <AppLogo />
          </Link>
          <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="space-y-6">
            {!supabase && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Supabase is not configured in this environment</AlertTitle>
                <AlertDescription>
                  Add <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>, then restart{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run dev</code> (these are inlined at dev/build start).
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john.doe@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="text-right">
                    <Link href="/forgot-password">
                        <span className="inline-block text-sm underline cursor-pointer">
                            Forgot your password?
                        </span>
                    </Link>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
            {showResend && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
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
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
