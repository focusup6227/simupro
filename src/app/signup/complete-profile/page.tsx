"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLogo from '@/components/app-logo';
import { useUser, useSupabase } from '@/supabase/provider';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { userToProfileInsert } from '@/lib/db-mappers';

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

  const [role, setRole] = useState<UserRole>('emt');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/signup');
    }
  }, [user, isUserLoading, router]);

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
          <CardTitle className="text-3xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>Welcome, {displayNameFromUser(user)}! Please select your role to continue.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleProfileCompletion} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="role">Your Professional Role</Label>
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
                    {isLoading ? 'Saving...' : 'Complete Sign Up'}
                </Button>
            </form>
        </CardContent>
      </Card>
    </main>
  );
}
