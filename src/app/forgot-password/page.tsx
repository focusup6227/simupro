"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppLogo from '@/components/app-logo';
import { useSupabase } from '@/supabase/provider';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const supabase = useSupabase();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Authentication service not available.",
      });
      return;
    }
    setIsLoading(true);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/login`,
      });
      if (error) throw error;
      setIsSubmitted(true);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error Sending Email",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-4">
            <AppLogo />
          </Link>
          <CardTitle className="text-3xl font-bold">Forgot Password</CardTitle>
          <CardDescription>
            {isSubmitted 
              ? "Check your inbox for the reset link."
              : "Enter your email to receive a password reset link."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="space-y-6 text-center">
                <Alert variant="default" className="text-left">
                    <Mail className="h-4 w-4" />
                    <AlertTitle>Email Sent!</AlertTitle>
                    <AlertDescription>
                        A password reset link has been sent to <span className="font-semibold">{email}</span>. Please check your inbox and spam folder.
                    </AlertDescription>
                </Alert>
                <Button asChild className="w-full">
                    <Link href="/login">Back to Login</Link>
                </Button>
            </div>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="john.doe@example.com" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
              <Button type="submit" className="w-full min-h-11" size="lg" disabled={isLoading || !supabase}>
                {isLoading ? 'Sending Link...' : 'Send Reset Link'}
              </Button>
              <div className="text-center text-sm">
                Remember your password?{' '}
                <Link href="/login" className="underline">
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
