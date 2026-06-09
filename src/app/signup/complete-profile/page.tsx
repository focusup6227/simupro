"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import AppLogo from '@/components/app-logo';
import { useUser, useSupabase } from '@/supabase/provider';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { userToProfileInsert } from '@/lib/db-mappers';
import type { UserRole } from '@/lib/types';

/**
 * Cert level chosen on the signup form, carried via user_metadata. `user_metadata` is
 * client-controlled, so we only trust the self-serve cert levels — never `admin`/`tester`/etc.,
 * which would be a privilege-escalation vector. Defaults to EMT.
 */
const SELF_SERVE_ROLES: readonly UserRole[] = ['emt', 'aemt', 'paramedic'];
function roleFromUser(user: { user_metadata?: Record<string, unknown> } | null): UserRole {
  const meta = user?.user_metadata ?? {};
  const role = typeof meta.role === 'string' ? (meta.role as UserRole) : null;
  return role && SELF_SERVE_ROLES.includes(role) ? role : 'emt';
}

function displayNameFromUser(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) {
  if (!user) return 'User';
  const meta = user.user_metadata ?? {};
  const fn = meta.full_name;
  const nm = meta.name;
  if (typeof fn === 'string' && fn) return fn;
  if (typeof nm === 'string' && nm) return nm;
  return user.email?.split('@')[0] ?? 'User';
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const supabase = useSupabase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<UserRole>('emt');
  const [roleInitialized, setRoleInitialized] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/signup');
    }
  }, [user, isUserLoading, router]);

  // Seed the picker from the cert level chosen on the signup form (carried in user_metadata),
  // once, when the user resolves — without clobbering a manual change afterward.
  useEffect(() => {
    if (user && !roleInitialized) {
      setRole(roleFromUser(user));
      setRoleInitialized(true);
    }
  }, [user, roleInitialized]);

  const handleProfileCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to complete your profile.",
      });
      return;
    }
    setIsLoading(true);

    try {
      const meta = user.user_metadata ?? {};
      const dn =
        typeof meta.full_name === 'string'
          ? meta.full_name
          : typeof meta.name === 'string'
            ? meta.name
            : user.email?.split('@')[0] ?? 'User';

      const photo =
        typeof meta.avatar_url === 'string' ? meta.avatar_url : null;

      const { error } = await supabase.from('profiles').upsert(
        userToProfileInsert({
          id: user.id,
          email: user.email ?? '',
          displayName: dn,
          photoURL: photo,
          role,
          isAdmin: false,
          hasCompletedTutorial: false,
          // They just picked a tier here, so the dashboard role gate shouldn't re-prompt.
          roleConfirmedAt: new Date().toISOString(),
        }),
        { onConflict: 'id' }
      );
      if (error) throw error;

      toast({
        title: "Profile Complete!",
        description: "Your account has been successfully set up.",
      });

      router.push('/dashboard');
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || !user) {
    return (
       <main className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
                 <div className="mx-auto mb-4"><AppLogo /></div>
                <CardTitle className="text-3xl font-bold">Finalizing Account</CardTitle>
                <CardDescription>Just one more step...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full mt-4" />
            </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
           <div className="mx-auto mb-4">
            <AppLogo />
          </div>
          <CardTitle className="text-3xl font-bold">Finish setting up</CardTitle>
          <CardDescription>
            You&apos;re all set, {displayNameFromUser(user)} — confirm below to enter your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleProfileCompletion} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="cert-tier">Certification level</Label>
                    <div
                      id="cert-tier"
                      className="flex rounded-md border border-input bg-background p-0.5"
                    >
                      {([
                        { value: 'emt', label: 'EMT' },
                        { value: 'aemt', label: 'AEMT' },
                        { value: 'paramedic', label: 'Paramedic' },
                      ] as const).map((opt) => {
                        const active = role === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRole(opt.value)}
                            className={`flex-1 py-2 rounded text-sm font-medium transition ${
                              active
                                ? 'bg-primary/10 text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scopes scenarios and grading to your level. You can change this anytime in{" "}
                      <strong className="text-foreground">Settings</strong>.
                    </p>
                </div>
                <Button type="submit" className="w-full min-h-11" size="lg" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Complete Sign Up'}
                </Button>
            </form>
        </CardContent>
      </Card>
    </main>
  );
}
