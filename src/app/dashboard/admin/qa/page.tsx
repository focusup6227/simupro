"use client";

import { useMemo, useState } from "react";
import { useCollection, useMemoSupabase, useSupabase, useUser } from "@/supabase";
import type { AiResponseFeedback } from "@/lib/types";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import {
  AiFeedbackReviewDialog,
  type AiFeedbackReviewFormValues,
} from "@/components/ai-feedback-review-dialog";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, FileWarning } from "lucide-react";
import {
  AdminProtocolImportReviewDialog,
  type AdminProtocolImportSelection,
} from "@/components/admin-protocol-import-review-dialog";
import { useRouter } from "next/navigation";

function statusBadge(status: AiResponseFeedback["reviewStatus"]) {
  switch (status) {
    case "validated":
      return <Badge className="bg-amber-600 hover:bg-amber-600">Validated</Badge>;
    case "dismissed":
      return <Badge variant="secondary">Dismissed</Badge>;
    default:
      return <Badge variant="destructive">Pending</Badge>;
  }
}

type ProtocolQueueRow = {
  id: string;
  display_name: string;
  original_filename: string;
  status: string;
  extraction_error: string | null;
  created_at: string;
  user_id?: string;
  workplace_id?: string;
};

export default function AdminQAPage() {
  const client = useSupabase();
  const router = useRouter();
  const { user: authUser } = useUser();
  const { toast } = useToast();
  const [selected, setSelected] = useState<AiResponseFeedback | null>(null);
  const [protocolSelected, setProtocolSelected] = useState<AdminProtocolImportSelection | null>(null);

  const spec = useMemoSupabase(
    () =>
      client
        ? {
            table: "ai_response_feedback" as const,
            order: { column: "created_at", ascending: false },
            live: true,
          }
        : null,
    [client],
  );
  const { data: rows, isLoading } = useCollection<AiResponseFeedback>(spec);

  const userProtocolQueueSpec = useMemoSupabase(
    () =>
      client
        ? {
            table: "user_protocol_imports" as const,
            columns:
              "id,display_name,original_filename,status,extraction_error,created_at,user_id",
            eq: { admin_review_status: "open" },
            order: { column: "created_at", ascending: false },
            live: true,
          }
        : null,
    [client],
  );
  const wpProtocolQueueSpec = useMemoSupabase(
    () =>
      client
        ? {
            table: "workplace_protocol_imports" as const,
            columns:
              "id,display_name,original_filename,status,extraction_error,created_at,workplace_id",
            eq: { admin_review_status: "open" },
            order: { column: "created_at", ascending: false },
            live: true,
          }
        : null,
    [client],
  );

  const { data: userProtocolQueue, isLoading: loadingUserPi } =
    useCollection<ProtocolQueueRow>(userProtocolQueueSpec);
  const { data: wpProtocolQueue, isLoading: loadingWpPi } = useCollection<ProtocolQueueRow>(wpProtocolQueueSpec);

  const protocolQueueRows = useMemo(() => {
    const u = (userProtocolQueue ?? []).map((r) => ({ ...r, scope: "user" as const }));
    const w = (wpProtocolQueue ?? []).map((r) => ({ ...r, scope: "workplace" as const }));
    return [...u, ...w].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [userProtocolQueue, wpProtocolQueue]);

  const handleReviewSubmit = async (
    id: string,
    values: AiFeedbackReviewFormValues,
  ) => {
    if (!client || !authUser) return;

    try {
      const { error } = await client
        .from("ai_response_feedback")
        .update({
          review_status: values.reviewStatus,
          admin_preferred_response: values.adminPreferredResponse?.trim() || null,
          admin_review_notes: values.adminReviewNotes?.trim() || null,
          reviewed_by: authUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Review saved", description: "Feedback record updated." });
      setSelected(null);
    } catch (e: unknown) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: e instanceof Error ? e.message : "Could not update.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" aria-hidden />
          QA
        </h1>
        <p className="mt-2 text-muted-foreground">
          Quality review for learner-reported issues, failed protocol PDF extractions, and AI behavior. Flagged patient
          replies include full simulation logs for prompt and scenario fixes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-amber-600" />
            Failed protocol imports
          </CardTitle>
          <CardDescription>
            Automatic extraction failed; learners are blocked until you re-scrub the PDF, paste valid JSON, or close the
            ticket with guidance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="max-w-xs">Error</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(loadingUserPi || loadingWpPi) && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loadingUserPi && !loadingWpPi && protocolQueueRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No failed protocol imports in the queue.
                  </TableCell>
                </TableRow>
              )}
              {!loadingUserPi &&
                !loadingWpPi &&
                protocolQueueRows.map((r) => (
                  <TableRow key={`${r.scope}-${r.id}`}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>{r.scope === "user" ? "Personal" : "Workplace"}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.display_name}</div>
                      <div className="truncate text-xs text-muted-foreground" title={r.original_filename}>
                        {r.original_filename}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {r.extraction_error ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setProtocolSelected({ scope: r.scope, id: r.id })}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bad AI replies</CardTitle>
          <CardDescription>
            Learners submit these from the simulation Performance panel. Newest first — review to validate, dismiss, or
            record a better reply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Scenario</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="max-w-xs">Learner comment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No AI feedback reports yet.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                rows?.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDistanceToNow(r.createdAt, { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-medium">{r.scenarioTitle}</TableCell>
                    <TableCell>{statusBadge(r.reviewStatus)}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {r.userComment}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelected(r)}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review AI feedback</DialogTitle>
            <DialogDescription>
              Confirm whether the flagged reply was inappropriate and capture an alternative phrasing for your team.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <AiFeedbackReviewDialog
              feedback={selected}
              onSubmit={handleReviewSubmit}
              onCancel={() => setSelected(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AdminProtocolImportReviewDialog
        open={protocolSelected !== null}
        onOpenChange={(open) => !open && setProtocolSelected(null)}
        selected={protocolSelected}
        onDone={() => router.refresh()}
      />
    </div>
  );
}
