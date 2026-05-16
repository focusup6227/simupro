"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLogo from '@/components/app-logo';
import { useSupabase } from '@/supabase/provider';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/lib/types';
import { userToProfileInsert } from '@/lib/db-mappers';
import { Mail, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SignUpPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('emt');
  const [isLoading, setIsLoading] = useState(false);
  const [needsEmailVerify, setNeedsEmailVerify] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast({
        variant: "destructive",
        title: "Sign-up Failed",
        description: "Authentication service not available.",
      });
      return;
    }
    setIsLoading(true);

    try {
      const displayName = `${firstName} ${lastName}`;
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_ORIGIN ?? '';
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName,
            role,
          },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) throw error;
      const user = data.user;

      if (data.session === null) {
        setNeedsEmailVerify(email);
        return;
      }

      if (!user) {
        toast({
          title: 'Check your email',
          description: 'Confirm your email address to finish sign-up.',
        });
        router.push('/login');
        return;
      }

      const { error: profileError } = await supabase.from('profiles').upsert(
        userToProfileInsert({
          id: user.id,
          email: user.email ?? email,
          displayName,
          photoURL: null,
          role,
          isAdmin: false,
          hasCompletedTutorial: false,
        }),
        { onConflict: 'id' }
      );
      if (profileError) throw profileError;

      toast({
        title: 'Account Created',
        description: 'Your account has been successfully created.',
      });

      router.push('/dashboard');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.toLowerCase().includes('already') || msg.includes('registered')) {
        toast({
          variant: "destructive",
          title: "Sign-up Failed",
          description: "This email is already in use. Please try another email or sign in.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Sign-up Failed",
          description: msg || "An unexpected error occurred.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };



  if (needsEmailVerify) {
    return (
      <main className="flex items-center justify-center min-h-screen p-4" style={{ background: '#04102b' }}>
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <Link href="/" className="flex items-center gap-3 mb-2">
              <AppLogo />
            </Link>
            <p className="text-[11px] uppercase tracking-[0.22em] font-mono mt-2" style={{ color: 'rgba(143,220,246,0.7)' }}>
              EMS Simulation &amp; Training
            </p>
          </div>
          <div className="rounded-2xl p-8 space-y-5" style={{ background: '#0b1f44', border: '1px solid #1c305e' }}>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(255,122,24,0.12)' }}>
                <Mail className="h-6 w-6" style={{ color: '#ff7a18' }} />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Check your email</h1>
              <p className="text-sm" style={{ color: '#8595c0' }}>
                We sent a verification link to{' '}
                <span className="font-medium text-white">{needsEmailVerify}</span>.
                Click it to activate your account.
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: 'rgba(63,184,229,0.25)', background: 'rgba(63,184,229,0.06)', color: '#8fdbf6' }}>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#3fb8e5' }} />
              <p>Once verified, you&apos;ll be redirected here automatically. You can close this tab in the meantime.</p>
            </div>
            <p className="text-sm" style={{ color: '#8595c0' }}>
              Didn&apos;t get it? Check spam, or{' '}
              <button
                type="button"
                className="underline underline-offset-4 hover:text-white transition"
                style={{ color: '#3fb8e5' }}
                onClick={async () => {
                  if (!supabase) return;
                  const origin =
                    typeof window !== 'undefined'
                      ? window.location.origin
                      : process.env.NEXT_PUBLIC_SITE_ORIGIN ?? '';
                  const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email: needsEmailVerify,
                    options: { emailRedirectTo: `${origin}/auth/callback` },
                  });
                  if (error) {
                    toast({
                      variant: 'destructive',
                      title: 'Could not resend',
                      description: error.message,
                    });
                  } else {
                    toast({ title: 'Verification email sent' });
                  }
                }}
              >
                resend the verification email
              </button>
              .
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="w-full" style={{ background: 'linear-gradient(180deg, #ff8a32 0%, #ff6a10 100%)', color: '#1a0d02', border: 'none' }}>
                <Link href="/login">Back to log in</Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                style={{ color: '#8595c0' }}
                onClick={() => setNeedsEmailVerify(null)}
              >
                Use a different email
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen p-4 py-10" style={{ background: '#04102b' }}>
      <div className="w-full max-w-md">
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
            <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
            <p className="text-sm mt-1" style={{ color: '#8595c0' }}>Free forever · No card required</p>
          </div>

          <div className="space-y-5">
            {!supabase && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Supabase is not configured in this environment</AlertTitle>
                <AlertDescription>
                  Add <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>, then restart.
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-sm font-medium" style={{ color: '#8595c0' }}>First name</Label>
                  <Input id="firstName" type="text" placeholder="John" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-sm font-medium" style={{ color: '#8595c0' }}>Last name</Label>
                  <Input id="lastName" type="text" placeholder="Doe" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium" style={{ color: '#8595c0' }}>Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium" style={{ color: '#8595c0' }}>Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-sm font-medium" style={{ color: '#8595c0' }}>Certification level</Label>
                <Select value={role} onValueChange={(value) => setRole(value as UserRole)} required>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emt">EMT</SelectItem>
                    <SelectItem value="aemt">AEMT</SelectItem>
                    <SelectItem value="paramedic">Paramedic</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs" style={{ color: '#5a6a93' }}>
                  Used to scope scenarios and grading to your cert level.
                </p>
              </div>
              <Button
                type="submit"
                className="w-full min-h-11 font-semibold"
                size="lg"
                disabled={isLoading}
                style={{ background: 'linear-gradient(180deg, #ff8a32 0%, #ff6a10 100%)', color: '#1a0d02', border: 'none' }}
              >
                {isLoading ? 'Creating account…' : 'Create free account'}
              </Button>
            </form>
          </div>

          <div className="mt-6 text-center text-sm" style={{ color: '#8595c0' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-white hover:underline">
              Sign in
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
