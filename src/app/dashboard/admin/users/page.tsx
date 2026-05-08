"use client"

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCollection, useSupabase, useMemoSupabase } from "@/supabase";
import type { User, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, ShieldCheck, BarChart3, Search, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { errorEmitter } from "@/supabase/error-emitter";
import { DatabasePermissionError } from "@/supabase/errors";
import { Input } from "@/components/ui/input";
import { deleteDocumentNonBlocking } from "@/supabase/non-blocking-updates";

const roles: UserRole[] = ["emt", "aemt", "paramedic", "tester", "admin"];
const formatPeriodEnd = (value?: string | Date) => {
    if (!value) return "N/A";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString();
};

export default function AdminUsersPage() {
    const client = useSupabase();
    const { toast } = useToast();
    const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);


    const usersSpec = useMemoSupabase(
        () => (client ? { table: 'profiles' as const } : null),
        [client]
    );
    const { data: users, isLoading } = useCollection<User>(usersSpec);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(user =>
            (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [users, searchTerm]);

    const handleChangeRole = async (userId: string, newRole: UserRole) => {
        if (!client) return;

        setIsUpdatingRole(userId);

        try {
            const newIsAdmin = newRole === 'admin';
            const { error } = await client
              .from('profiles')
              .update({ role: newRole, is_admin: newIsAdmin })
              .eq('id', userId);
            if (error) throw error;

            toast({
                title: 'Role Updated',
                description: `User role changed to ${newRole}. The user must sign out and sign back in to refresh JWT claims if applicable.`,
                duration: 7000,
            });
        } catch (error: unknown) {
             const permissionError = new DatabasePermissionError({
                path: `profiles/${userId}`,
                operation: 'update',
                requestResourceData: { role: newRole, isAdmin: newRole === 'admin' }
            });
            errorEmitter.emit('permission-error', permissionError);

            console.error("Error updating role: ", error);
        } finally {
            setIsUpdatingRole(null);
        }
    };

    const openDeleteDialog = (user: User) => {
        setUserToDelete(user);
        setIsDeleteAlertOpen(true);
    };

    const deleteUserCompletely = async () => {
        if (!client || !userToDelete) return;

        try {
            deleteDocumentNonBlocking(client, 'profiles', userToDelete.id);

            toast({
                title: 'User Deleted',
                description: `The user ${userToDelete.email} has been removed from the user list (profile row deleted).`,
            });
        } catch (error) {
             errorEmitter.emit('permission-error', new DatabasePermissionError({
                path: `profiles/${userToDelete.id}`,
                operation: 'delete',
            }));
        } finally {
            setIsDeleteAlertOpen(false);
            setUserToDelete(null);
        }
    };


    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Users</h1>
                    <p className="text-muted-foreground">
                        View and manage all registered users.
                    </p>
                </div>
            </div>

             <Card>
                <CardHeader>
                    <CardTitle>User List</CardTitle>
                    <CardDescription>A list of all users in the system.</CardDescription>
                     <div className="relative pt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Is Admin?</TableHead>
                            <TableHead>Premium</TableHead>
                            <TableHead>Billing</TableHead>
                            <TableHead>
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoading && filteredUsers.length === 0 && (
                                 <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoading && filteredUsers.map(user => (
                                <TableRow key={user.id} className={isUpdatingRole === user.id ? 'opacity-50' : ''}>
                                    <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">{user.role}</Badge>
                                    </TableCell>
                                     <TableCell>
                                        {user.isAdmin && <ShieldCheck className="h-5 w-5 text-primary" />}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.isPremium ? 'default' : 'outline'}>
                                            {user.isPremium ? 'Premium' : 'Free'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <div className="space-y-0.5">
                                            <div>Status: {user.premiumStatus ?? 'n/a'}</div>
                                            <div>Renewal: {formatPeriodEnd(user.premiumCurrentPeriodEnd)}</div>
                                            <div className="truncate max-w-[180px]">Customer: {user.stripeCustomerId ?? 'n/a'}</div>
                                            <div className="truncate max-w-[180px]">Sub: {user.stripeSubscriptionId ?? 'n/a'}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost" disabled={!!isUpdatingRole}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <Link href={`/dashboard/admin/users/${user.id}/performance`}>
                                                    <DropdownMenuItem>
                                                        <BarChart3 className="mr-2" /> View Performance
                                                    </DropdownMenuItem>
                                                </Link>
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>Change Role</DropdownMenuSubTrigger>
                                                    <DropdownMenuPortal>
                                                        <DropdownMenuSubContent>
                                                            {roles.map(role => (
                                                                <DropdownMenuItem key={role} onClick={() => void handleChangeRole(user.id, role)} className="capitalize" disabled={user.role === role}>
                                                                    {role}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuPortal>
                                                </DropdownMenuSub>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteDialog(user)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>

             <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action removes the profile and cascades related simulation data where configured. Auth users may remain until cleaned up separately.
                            <span className="font-bold block mt-2">{userToDelete?.displayName}</span> ({userToDelete?.email})
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void deleteUserCompletely()} className="bg-destructive hover:bg-destructive/90">
                            Yes, delete user
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}
