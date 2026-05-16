"use client";

// SimuPro Admin · Support — restyled to Mission Board visual language.
// Functionality preserved 1:1: useCollection<SupportTicket>, update flow
// fetches existing responses, appends admin response (responder='Admin',
// createdAt=now), persists JSON, updates status. Uses SupportTicketDialog
// for the manage UI.

import * as React from "react";
import { useState } from "react";
import { useCollection, useSupabase, useMemoSupabase } from "@/supabase";
import type {
  SupportTicket,
  SupportTicketResponse,
  SupportTicketKind,
} from "@/lib/types";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SupportTicketDialog } from "@/components/support-ticket-dialog";
import type { Json } from "@/lib/supabase/database.types";
import { toDate } from "@/lib/date-utils";
import { Panel } from "@/components/app/app-primitives";

function formatTicketTime(timestamp: unknown) {
  if (!timestamp) return "—";
  const date = toDate(timestamp);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : "—";
}

function ticketKindLabel(kind: SupportTicketKind): string {
  switch (kind) {
    case "feature_request":
      return "Feature";
    case "issue":
      return "Issue";
    default:
      return "Support";
  }
}

function ticketKindTag(kind: SupportTicketKind): string {
  switch (kind) {
    case "feature_request":
      return "tag-cyan";
    case "issue":
      return "tag-amber";
    default:
      return "tag-orange";
  }
}

function statusTag(status: SupportTicket["status"]): string {
  switch (status) {
    case "new":
      return "tag-rose";
    case "in-progress":
      return "tag-amber";
    case "resolved":
      return "tag-emerald";
    default:
      return "";
  }
}

export default function AdminSupportPage() {
  const client = useSupabase();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const ticketsSpec = useMemoSupabase(
    () =>
      client
        ? {
            table: "support_tickets" as const,
            order: { column: "created_at", ascending: false },
          }
        : null,
    [client],
  );
  const { data: tickets, isLoading } = useCollection<SupportTicket>(ticketsSpec);

  const handleDialogClose = () => setSelectedTicket(null);

  const handleFormSubmit = async (
    ticketId: string,
    values: { response?: string; status: "new" | "in-progress" | "resolved" },
  ) => {
    if (!client) return;
    try {
      const { data: row, error: fetchErr } = await client
        .from("support_tickets")
        .select("responses")
        .eq("id", ticketId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      const prevRaw = row?.responses;
      const prev: SupportTicketResponse[] = Array.isArray(prevRaw)
        ? (prevRaw as SupportTicketResponse[])
        : [];
      let nextResponses: SupportTicketResponse[] = [...prev];
      if (values.response?.trim()) {
        const newResponse: SupportTicketResponse = {
          responder: "Admin",
          message: values.response,
          createdAt: new Date(),
        };
        nextResponses = [...prev, newResponse];
      }
      const { error } = await client
        .from("support_tickets")
        .update({
          status: values.status,
          responses: JSON.parse(JSON.stringify(nextResponses)) as Json,
        })
        .eq("id", ticketId);
      if (error) throw error;
      handleDialogClose();
    } catch (e: unknown) {
      console.error(e);
    }
  };

  return (
    <div className="p-7 max-w-[1400px] mx-auto space-y-5">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5">
          // ADMIN · SUPPORT · {tickets?.length ?? "—"} TICKETS
        </div>
        <h1 className="font-display font-bold text-[30px] text-white leading-none">
          Support tickets
        </h1>
        <p className="text-[13px] text-[var(--text-mute)] mt-2 max-w-3xl">
          View and manage support contact, simulation issue reports, and feature requests.
        </p>
      </div>

      <Panel
        title="Incoming tickets"
        sub="Sorted by newest first — type distinguishes general support, in-sim issues, and feature ideas."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-dim)] font-mono">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">Type</th>
                <th className="text-left font-medium px-2 py-2.5">Submitted</th>
                <th className="text-left font-medium px-2 py-2.5">From</th>
                <th className="text-left font-medium px-2 py-2.5 max-w-sm">Message</th>
                <th className="text-left font-medium px-2 py-2.5">Status</th>
                <th className="text-right font-medium px-5 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="h-20 text-center text-[var(--text-mute)]">
                    Loading tickets…
                  </td>
                </tr>
              )}
              {!isLoading && tickets?.length === 0 && (
                <tr>
                  <td colSpan={6} className="h-20 text-center text-[var(--text-mute)]">
                    No support tickets found.
                  </td>
                </tr>
              )}
              {!isLoading &&
                tickets?.map((ticket) => (
                  <tr key={ticket.id} className="border-t hair">
                    <td className="px-5 py-3">
                      <span className={`tag ${ticketKindTag(ticket.ticketKind)}`}>
                        {ticketKindLabel(ticket.ticketKind)}
                      </span>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-[var(--text-mute)] font-mono">
                      {formatTicketTime(ticket.createdAt)}
                    </td>
                    <td className="px-2 py-3 text-[var(--text-mute)] font-mono">
                      {ticket.userEmail}
                    </td>
                    <td className="px-2 py-3 whitespace-pre-wrap max-w-sm">
                      {ticket.scenarioTitle && (
                        <p className="text-[10.5px] font-mono text-[var(--text-dim)] uppercase tracking-[0.12em] mb-1">
                          Scenario: {ticket.scenarioTitle}
                        </p>
                      )}
                      <p className="text-white truncate">{ticket.message}</p>
                    </td>
                    <td className="px-2 py-3">
                      <span className={`tag ${statusTag(ticket.status)} capitalize`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(ticket)}
                        className="cta-secondary h-8 px-3 rounded-md text-[12px] font-medium"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog
        open={!!selectedTicket}
        onOpenChange={(isOpen) => !isOpen && handleDialogClose()}
      >
        <DialogContent className="sm:max-w-2xl">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle>Manage support ticket</DialogTitle>
                <DialogDescription>
                  From: {selectedTicket.userEmail}
                </DialogDescription>
              </DialogHeader>
              <SupportTicketDialog
                ticket={selectedTicket}
                onSubmit={handleFormSubmit}
                onCancel={handleDialogClose}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
