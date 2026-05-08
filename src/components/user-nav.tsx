"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useUser, useDashboardProfile } from "@/supabase";
import { LogOut, Shield, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "./ui/skeleton";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isAdminUser } from "@/lib/user-permissions";


export function UserNav() {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const { data: userData, isLoading: isUserDataLoading } = useDashboardProfile();

  const handleSignOut = async () => {
    if (auth) {
        await auth.signOut();
    }
    router.push('/');
  };

  const isLoading = isAuthLoading || isUserDataLoading;

  if (isLoading) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const names = name.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return name.charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const isAdmin = isAdminUser(userData);
  const isTester = userData?.role === "tester" && !isAdmin;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-auto p-1 rounded-full">
            <div className="flex items-center gap-2">
                <Avatar className={cn("h-8 w-8", isAdmin ? "ring-2 ring-cyan-500" : isTester && "ring-2 ring-green-500")}>
                  {userData?.photoURL && <AvatarImage src={userData.photoURL} alt={userData.displayName || 'User'} />}
                  <AvatarFallback>{getInitials(userData?.displayName, authUser?.email)}</AvatarFallback>
                </Avatar>
                {isAdmin ? (
                    <span className="text-xs font-bold uppercase text-cyan-500 pr-2">
                        ADMIN
                    </span>
                ) : isTester && (
                    <span className="text-xs font-bold uppercase text-green-500 pr-2">
                        TESTER
                    </span>
                )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {userData?.displayName || "User"}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {authUser?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
             <Link href="/dashboard/settings">
                <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                </DropdownMenuItem>
              </Link>
            {isAdmin && (
              <Link href="/dashboard/admin">
                <DropdownMenuItem>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin</span>
                </DropdownMenuItem>
              </Link>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void handleSignOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
