"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <main className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <Link href="/" className="mx-auto mb-4">
              <AppLogo />
            </Link>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription>
              We sent a verification link to <span className="font-medium text-foreground">{needsEmailVerify}</span>.
              Click it to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-foreground/80">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Once verified, you&apos;ll be redirected here automatically. You can close this tab in the meantime.
              </p>
            </div>
            <p className="text-muted-foreground">
              Didn&apos;t get it? Check spam, or{' '}
              <button
                type="button"
                className="text-foreground underline underline-offset-4"
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
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Back to log in</Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setNeedsEmailVerify(null)}
              >
                Use a different email
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
           <Link href="/" className="mx-auto mb-4">
            <AppLogo />
          </Link>
          <CardTitle className="text-3xl font-bold">Create an Account</CardTitle>
          <CardDescription>Enter your credentials to get started</CardDescription>
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
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run dev</code>.
                    </AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleSignUp} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" type="text" placeholder="John" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" type="text" placeholder="Doe" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="john.doe@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
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
                        <p className="text-sm text-muted-foreground pt-1">
                            Please select your current certification level.
                        </p>
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </Button>
                </form>
            </div>
           <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
