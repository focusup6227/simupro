
"use client";

import { useUser, useDashboardProfile } from "@/supabase";
import { isTesterOrAdminUser } from "@/lib/user-permissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

function AccessDenied() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="p-8">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to view this page. You will be redirected to the dashboard.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function TesterAuthWrapper({ children }: { children: React.ReactNode }) {
  const { isUserLoading } = useUser();

  const { data: userData, isLoading: isUserDataLoading, error } = useDashboardProfile();

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading) {
    return <div className="p-8">Verifying tester permissions...</div>;
  }

  if (error) {
     return (
        <div className="p-8">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Permission Error</AlertTitle>
                <AlertDescription>
                    Could not verify your permissions due to a database error. If you are a tester and this issue persists,
                    verify Supabase Row Level Security policies allow reading your profile.
                    <pre className="mt-2 text-xs bg-muted p-2 rounded">{error.message}</pre>
                </AlertDescription>
            </Alert>
        </div>
        );
  }

  const isAuthorized = isTesterOrAdminUser(userData);

  if (!isAuthorized) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}


export default function TesterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TesterAuthWrapper>{children}</TesterAuthWrapper>;
}
