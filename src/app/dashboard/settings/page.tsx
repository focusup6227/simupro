"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CreditCard, Moon, Star, Sun, Trash2 } from "lucide-react"
import Link from "next/link"
import type { Database } from "@/lib/supabase/database.types";
import { useAuth, useUser, useSupabase, useMemoSupabase, useDashboardProfile } from "@/supabase";
import type { User, UserProfile } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserProfileSchema } from "@/lib/types";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";


export default function SettingsPage() {
  const { setTheme } = useTheme()
  const { user: authUser, isUserLoading } = useUser();
  const auth = useAuth();
  const client = useSupabase();
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const { data: userData, isLoading: isUserDataLoading } = useDashboardProfile();

  const form = useForm<UserProfile>({
    resolver: zodResolver(UserProfileSchema),
    defaultValues: {
      displayName: "",
      photoURL: "",
      role: "emt",
    }
  });

  const photoUrlValue = form.watch("photoURL");

  useEffect(() => {
    if (userData) {
      let defaultRole: 'emt' | 'aemt' | 'paramedic' = 'emt';
      if (userData.role === 'tester' && userData.testRole) {
        defaultRole = userData.testRole;
      } else if (userData.role === 'emt' || userData.role === 'aemt' || userData.role === 'paramedic') {
        defaultRole = userData.role;
      }

      form.reset({
        displayName: userData.displayName || "",
        photoURL: userData.photoURL || "",
        role: defaultRole,
      });
    }
  }, [userData, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldChange: (value: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        fieldChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: UserProfile) => {
    if (!client || !authUser || !userData) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not logged in.' });
      return;
    }

    try {
      const patch: Database['public']['Tables']['profiles']['Update'] = {
        display_name: values.displayName,
        photo_url: values.photoURL || null,
      };

      if (userData.role === 'tester') {
        patch.test_role = values.role;
      } else {
        patch.role = values.role;
      }

      const { error } = await client.from('profiles').update(patch).eq('id', authUser.id);
      if (error) throw error;
      toast({ title: 'Profile Updated', description: 'Your settings have been saved.' });
    } catch (e: unknown) {
      console.error("Error updating profile: ", e);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e instanceof Error ? e.message : "Could not update your profile.",
      });
    }
  };

  const handleManageSubscription = async () => {
    setIsOpeningPortal(true);
    try {
      const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not open billing portal.');
      }
      window.location.href = data.url;
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not open billing portal',
        description: e instanceof Error ? e.message : 'Please try again.',
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const formatPeriodEnd = (val: User['premiumCurrentPeriodEnd']) => {
    if (!val) return null;
    const d = val instanceof Date ? val : new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleDeleteAccount = async () => {
    if (!authUser || !auth) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not delete account.",
        });
        return;
    }

    setIsDeleteAlertOpen(false);

    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || `Failed (${res.status})`);
      }

      await auth.signOut();

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      router.push('/login');
    } catch (error: unknown) {
        console.error("Error deleting account:", error);
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: error instanceof Error ? error.message : "An error occurred.",
        });
    }
  };

  const isLoading = isUserLoading || isUserDataLoading;

  const showRoleSelector = userData?.role !== 'admin';
  const roleSelectorLabel = userData?.role === 'tester' ? "Simulation Role (as Tester)" : "Default Role";


  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application settings.
        </p>
      </div>

       <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                This is how other users will see you on the site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="photoURL"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Picture</FormLabel>
                         <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={photoUrlValue || undefined} alt="Profile picture" />
                                <AvatarFallback>{userData?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <FormControl>
                                <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, field.onChange)}
                                className="max-w-xs"
                                />
                            </FormControl>
                        </div>
                        <FormDescription>
                          Upload a picture for your profile.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showRoleSelector && (
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{roleSelectorLabel}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="emt">EMT</SelectItem>
                              <SelectItem value="aemt">AEMT</SelectItem>
                              <SelectItem value="paramedic">Paramedic</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {userData?.role === 'tester'
                                ? "This role will be used when you run scenarios from the Tester Dashboard."
                                : "This is your default role for simulations."
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
                {form.formState.isSubmitting ? "Saving..." : "Save"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>
            Manage your Premium subscription, payment method, and invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : userData?.isPremium ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300/60 bg-yellow-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
                  <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                  Premium
                </span>
                {userData.premiumStatus && (
                  <span className="text-sm text-muted-foreground">
                    Status: <span className="font-medium capitalize">{userData.premiumStatus}</span>
                  </span>
                )}
                {formatPeriodEnd(userData.premiumCurrentPeriodEnd) && (
                  <span className="text-sm text-muted-foreground">
                    Renews: <span className="font-medium">{formatPeriodEnd(userData.premiumCurrentPeriodEnd)}</span>
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Open the secure Stripe billing portal to update your payment method, download invoices, or cancel your subscription. Cancellations take effect at the end of the current billing period — your access stays active until then.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => void handleManageSubscription()} disabled={isOpeningPortal}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isOpeningPortal ? 'Opening portal…' : 'Manage Subscription'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You’re currently on the Free plan. Upgrade to Premium ($10/month) for the full Premium scenario library, deep-dive AI feedback, and advanced patient realism. Cancel anytime.
              </p>
              <Button asChild>
                <Link href="/billing">
                  <Star className="mr-2 h-4 w-4" />
                  Go Premium — $10/month
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the look and feel of the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="text-lg font-medium">Theme</h3>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => setTheme("light")}>
              <Sun className="mr-2" /> Light
            </Button>
            <Button variant="outline" onClick={() => setTheme("dark")}>
              <Moon className="mr-2" /> Dark
            </Button>
            <Button variant="outline" onClick={() => setTheme("system")}>
              System
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            These actions are permanent and cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)}>
                <Trash2 className="mr-2" />
                Delete Account
              </Button>
            </div>
        </CardContent>
      </Card>

       <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove all your data from our servers.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={() => void handleDeleteAccount()}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    Yes, delete my account
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
