"use client";

// SimuPro Admin · Billing — restyled to Mission Board visual language.
// Functionality preserved 1:1: useCollection<User>, search + status filter,
// copy-to-clipboard for Stripe IDs, formatted renewal date.

import * as React from "react";
import { useMemo, useState } from "react";
import { useCollection, useMemoSupabase, useSupabase } from "@/supabase";
import type { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Panel } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

type BillingFilter =
  | "all"
  | "active"
  | "trialing"
  | "canceled"
  | "past_due"
  | "paused";

const formatDate = (value?: string | Date) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

export default function AdminBillingPage() {
  const client = useSupabase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BillingFilter>("all");

  const usersSpec = useMemoSupabase(
    () => (client ? { table: "profiles" as const } : null),
    [client],
  );
  const { data: users, isLoading } = useCollection<User>(usersSpec);

  const filteredUsers = useMemo(() => {
    const list = users ?? [];
    return list.filter((u) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        u.email.toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q);
      const status = (u.premiumStatus ?? "").toLowerCase();
      const matchesStatus = statusFilter === "all" ? true : status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const copyText = async (label: string, value?: string) => {
    if (!value) {
      toast({
        variant: "destructive",
        title: "Nothing to copy",
        description: `${label} is empty.`,
      });
      return;
    }
    await navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  return (
    <div className="p-7 max-w-[1400px] mx-auto space-y-5">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5">
          // ADMIN · BILLING · STRIPE
        </div>
        <h1 className="font-display font-bold text-[30px] text-white leading-none">
          Billing
        </h1>
        <p className="text-[13px] text-[var(--text-mute)] mt-2">
          View Stripe subscription status and copy Stripe identifiers.
        </p>
      </div>

      <Panel
        title="Stripe subscriptions"
        sub="Filter by status and inspect per-user billing metadata"
        action={
          <div className="flex gap-2">
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md w-56"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-soft)",
              }}
            >
              <Icons.Search className="w-3.5 h-3.5 text-[var(--text-dim)]" />
              <input
                className="bg-transparent flex-1 text-[12.5px] text-white placeholder:text-[var(--text-dim)] outline-none"
                placeholder="Search…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="fld text-[12.5px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BillingFilter)}
              style={{ minWidth: 130, height: 32, padding: "0 10px" }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="past_due">Past due</option>
              <option value="paused">Paused</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-dim)] font-mono">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">User</th>
                <th className="text-left font-medium px-2 py-2.5">Premium</th>
                <th className="text-left font-medium px-2 py-2.5">Status</th>
                <th className="text-left font-medium px-2 py-2.5">Renewal</th>
                <th className="text-left font-medium px-2 py-2.5">Customer ID</th>
                <th className="text-left font-medium px-5 py-2.5">Subscription ID</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-[var(--text-mute)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-[var(--text-mute)]">
                    No billing records match this filter.
                  </td>
                </tr>
              )}
              {!isLoading &&
                filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t hair">
                    <td className="px-5 py-3">
                      <div className="font-medium text-white">
                        {u.displayName || "—"}
                      </div>
                      <div className="text-[11px] text-[var(--text-mute)] font-mono">
                        {u.email}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <span className={`tag ${u.isPremium ? "tag-amber" : ""}`}>
                        {u.isPremium ? "Premium" : "Free"}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="tag">{u.premiumStatus ?? "n/a"}</span>
                    </td>
                    <td className="px-2 py-3 font-mono text-[var(--text-mute)]">
                      {formatDate(u.premiumCurrentPeriodEnd)}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] max-w-[160px] truncate text-[var(--text-mute)]">
                          {u.stripeCustomerId ?? "n/a"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void copyText("Customer ID", u.stripeCustomerId)
                          }
                          aria-label="Copy customer ID"
                          className="cta-ghost w-7 h-7 rounded-md inline-flex items-center justify-center"
                        >
                          <Icons.File className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] max-w-[160px] truncate text-[var(--text-mute)]">
                          {u.stripeSubscriptionId ?? "n/a"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void copyText("Subscription ID", u.stripeSubscriptionId)
                          }
                          aria-label="Copy subscription ID"
                          className="cta-ghost w-7 h-7 rounded-md inline-flex items-center justify-center"
                        >
                          <Icons.File className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
