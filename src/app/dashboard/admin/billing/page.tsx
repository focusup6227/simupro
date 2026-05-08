"use client";

import { useMemo, useState } from "react";
import { useCollection, useMemoSupabase, useSupabase } from "@/supabase";
import type { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type BillingFilter = "all" | "active" | "trialing" | "canceled" | "past_due" | "paused";

const formatDate = (value?: string | Date) => {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
};

export default function AdminBillingPage() {
  const client = useSupabase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BillingFilter>("all");

  const usersSpec = useMemoSupabase(
    () => (client ? { table: "profiles" as const } : null),
    [client]
  );
  const { data: users, isLoading } = useCollection<User>(usersSpec);

  const filteredUsers = useMemo(() => {
    const list = users ?? [];
    return list.filter((user) => {
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.displayName ?? "").toLowerCase().includes(searchTerm.toLowerCase());
      const status = (user.premiumStatus ?? "").toLowerCase();
      const matchesStatus = statusFilter === "all" ? true : status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const copyText = async (label: string, value?: string) => {
    if (!value) {
      toast({ variant: "destructive", title: "Nothing to copy", description: `${label} is empty.` });
      return;
    }
    await navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          View Stripe subscription status and copy Stripe identifiers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stripe Subscriptions</CardTitle>
          <CardDescription>Filter by status and inspect per-user billing metadata.</CardDescription>
          <div className="flex flex-col gap-3 pt-2 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: BillingFilter) => setStatusFilter(value)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead>Customer ID</TableHead>
                <TableHead>Subscription ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No billing records match this filter.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.displayName || "N/A"}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isPremium ? "default" : "outline"}>
                        {user.isPremium ? "Premium" : "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.premiumStatus ?? "n/a"}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.premiumCurrentPeriodEnd)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="max-w-[180px] truncate text-xs">
                          {user.stripeCustomerId ?? "n/a"}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Copy customer ID"
                          onClick={() => void copyText("Customer ID", user.stripeCustomerId)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="max-w-[180px] truncate text-xs">
                          {user.stripeSubscriptionId ?? "n/a"}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Copy subscription ID"
                          onClick={() => void copyText("Subscription ID", user.stripeSubscriptionId)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

