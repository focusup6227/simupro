"use client";

import { useState } from "react";
import { useCollection, useSupabase, useMemoSupabase } from "@/supabase";
import type {
  SupportTicket,
  SupportTicketResponse,
  SupportTicketKind,
} from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SupportTicketDialog } from "@/components/support-ticket-dialog";
import type { Json } from "@/lib/supabase/database.types";
import { toDate } from "@/lib/date-utils";

function formatTicketTime(timestamp: unknown) {
    if (!timestamp) return 'N/A';
    const date = toDate(timestamp);
    return date ? formatDistanceToNow(date, { addSuffix: true }) : 'N/A';
}

function ticketKindLabel(kind: SupportTicketKind): string {
    switch (kind) {
        case 'feature_request':
            return 'Feature';
        case 'issue':
            return 'Issue';
        default:
            return 'Support';
    }
}

function ticketKindBadgeVariant(kind: SupportTicketKind): 'default' | 'secondary' | 'outline' {
    switch (kind) {
        case 'feature_request':
            return 'secondary';
        case 'issue':
            return 'outline';
        default:
            return 'default';
    }
}

export default function AdminSupportPage() {
  const client = useSupabase();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const ticketsSpec = useMemoSupabase(
    () =>
      client
        ? {
            table: 'support_tickets' as const,
            order: { column: 'created_at', ascending: false },
          }
        : null,
    [client]
  );
  const { data: tickets, isLoading } = useCollection<SupportTicket>(ticketsSpec);

  const handleDialogClose = () => {
    setSelectedTicket(null);
  };

  const handleFormSubmit = async (
    ticketId: string,
    values: { response?: string; status: 'new' | 'in-progress' | 'resolved' }
  ) => {
    if (!client) return;

    try {
      const { data: row, error: fetchErr } = await client
        .from('support_tickets')
        .select('responses')
        .eq('id', ticketId)
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
          message: values.response!,
          createdAt: new Date(),
        };
        nextResponses = [...prev, newResponse];
      }

      const { error } = await client
        .from('support_tickets')
        .update({
          status: values.status,
          responses: JSON.parse(JSON.stringify(nextResponses)) as Json,
        })
        .eq('id', ticketId);

      if (error) throw error;
      handleDialogClose();
    } catch (e: unknown) {
      console.error(e);
    }
  };

  const statusVariant = (status: SupportTicket['status']) => {
    switch (status) {
      case 'new':
        return 'destructive';
      case 'in-progress':
        return 'secondary';
      case 'resolved':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
        <p className="text-muted-foreground">
          View and manage support contact, simulation issue reports, and feature requests.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incoming Tickets</CardTitle>
          <CardDescription>
            Sorted by newest first — type distinguishes general support, in-sim issues, and feature ideas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading tickets...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && tickets?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No support tickets found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                tickets?.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="w-[104px]">
                      <Badge variant={ticketKindBadgeVariant(ticket.ticketKind)}>
                        {ticketKindLabel(ticket.ticketKind)}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[150px]">{formatTicketTime(ticket.createdAt)}</TableCell>
                    <TableCell>{ticket.userEmail}</TableCell>
                    <TableCell className="whitespace-pre-wrap max-w-sm">
                      {ticket.scenarioTitle && (
                        <p className="font-semibold text-xs text-muted-foreground/80 mb-1">
                          Scenario: {ticket.scenarioTitle}
                        </p>
                      )}
                      <p className="truncate">{ticket.message}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(ticket.status)} className="capitalize">{ticket.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket)}>
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedTicket} onOpenChange={(isOpen) => !isOpen && handleDialogClose()}>
        <DialogContent className="sm:max-w-2xl">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle>Manage Support Ticket</DialogTitle>
                <DialogDescription>From: {selectedTicket.userEmail}</DialogDescription>
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
