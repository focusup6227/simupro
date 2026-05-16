"use client";

// SimuPro Admin · QA — restyled to Mission Board visual language.
// Functionality preserved 1:1:
//   - useCollection<AiResponseFeedback> (live)
//   - useCollection of user_protocol_imports + workplace_protocol_imports
//     (admin_review_status='open')
//   - merge + sort protocol queue by created_at desc
//   - AiFeedbackReviewDialog + AdminProtocolImportReviewDialog
//   - Update ai_response_feedback on submit (review_status,
//     admin_preferred_response, admin_review_notes, reviewed_by, reviewed_at)

import * as React from "react";
import { useMemo, useState } from "react";
import {
  useCollection,
  useMemoSupabase,
  useSupabase,
  useUser,
} from "@/supabase";
import type { AiResponseFeedback } from "@/lib/types";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AiFeedbackReviewDialog,
  type AiFeedbackReviewFormValues,
} from "@/components/ai-feedback-review-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AdminProtocolImportReviewDialog,
  type AdminProtocolImportSelection,
} from "@/components/admin-protocol-import-review-dialog";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

function statusBadge(status: AiResponseFeedback["reviewStatus"]) {
  switch (status) {
    case "validated":
      return <span className="tag tag-amber">Validated</span>;
    case "dismissed":
      return <span className="tag">Dismissed</span>;
    default:
      return <span className="tag tag-rose">Pending</span>;
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
  const [protocolSelected, setProtocolSelected] =
    useState<AdminProtocolImportSelection | null>(null);

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
  const { data: wpProtocolQueue, isLoading: loadingWpPi } =
    useCollection<ProtocolQueueRow>(wpProtocolQueueSpec);

  const protocolQueueRows = useMemo(() => {
    const u = (userProtocolQueue ?? []).map((r) => ({
      ...r,
      scope: "user" as const,
    }));
    const w = (wpProtocolQueue ?? []).map((r) => ({
      ...r,
      scope: "workplace" as const,
    }));
    return [...u, ...w].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
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
    <div className="p-7 max-w-[1400px] mx-auto space-y-5">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5">
          // ADMIN · QA QUEUE
        </div>
        <h1 className="font-display font-bold text-[30px] text-white leading-none flex items-center gap-2.5">
          <Icons.CheckCircle className="w-7 h-7 text-[var(--cyan-soft)]" />
          QA
        </h1>
        <p className="text-[13px] text-[var(--text-mute)] mt-2 max-w-3xl">
          Quality review for learner-reported issues, failed protocol PDF extractions, and AI behavior. Flagged patient replies include full simulation logs for prompt and scenario fixes.
        </p>
      </div>

      <Panel
        title={
          <span className="flex items-center gap-2">
            <Icons.Triangle className="w-4 h-4 text-[var(--warn)]" />
            Failed protocol imports
          </span>
        }
        sub="Automatic extraction failed; learners are blocked until you re-scrub the PDF, paste valid JSON, or close the ticket with guidance."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-dim)] font-mono">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">When</th>
                <th className="text-left font-medium px-2 py-2.5">Scope</th>
                <th className="text-left font-medium px-2 py-2.5">Name</th>
                <th className="text-left font-medium px-2 py-2.5 max-w-xs">Error</th>
                <th className="text-right font-medium px-5 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(loadingUserPi || loadingWpPi) && (
                <tr>
                  <td colSpan={5} className="h-20 text-center text-[var(--text-mute)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!loadingUserPi &&
                !loadingWpPi &&
                protocolQueueRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="h-20 text-center text-[var(--text-mute)]"
                    >
                      No failed protocol imports in the queue.
                    </td>
                  </tr>
                )}
              {!loadingUserPi &&
                !loadingWpPi &&
                protocolQueueRows.map((r) => (
                  <tr key={`${r.scope}-${r.id}`} className="border-t hair">
                    <td className="px-5 py-3 text-[var(--text-mute)] font-mono whitespace-nowrap">
                      {formatDistanceToNow(new Date(r.created_at), {
                        addSuffix: true,
                      })}
                    </td>
                    <td className="px-2 py-3">
                      <span className="tag capitalize">
                        {r.scope === "user" ? "Personal" : "Workplace"}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="font-medium text-white">{r.display_name}</div>
                      <div
                        className="truncate text-[11px] text-[var(--text-mute)] font-mono max-w-[220px]"
                        title={r.original_filename}
                      >
                        {r.original_filename}
                      </div>
                    </td>
                    <td className="px-2 py-3 max-w-xs truncate text-[var(--text-mute)]">
                      {r.extraction_error ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setProtocolSelected({ scope: r.scope, id: r.id })
                        }
                        className="cta-secondary h-8 px-3 rounded-md text-[12px] font-medium"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Bad AI replies"
        sub="Learners submit these from the simulation Performance panel. Newest first — review to validate, dismiss, or record a better reply."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-dim)] font-mono">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">When</th>
                <th className="text-left font-medium px-2 py-2.5">Scenario</th>
                <th className="text-left font-medium px-2 py-2.5">Status</th>
                <th className="text-left font-medium px-2 py-2.5 max-w-xs">Comment</th>
                <th className="text-right font-medium px-5 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="h-20 text-center text-[var(--text-mute)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && rows?.length === 0 && (
                <tr>
                  <td colSpan={5} className="h-20 text-center text-[var(--text-mute)]">
                    No AI feedback reports yet.
                  </td>
                </tr>
              )}
              {!isLoading &&
                rows?.map((r) => (
                  <tr key={r.id} className="border-t hair">
                    <td className="px-5 py-3 text-[var(--text-mute)] font-mono whitespace-nowrap">
                      {formatDistanceToNow(r.createdAt, { addSuffix: true })}
                    </td>
                    <td className="px-2 py-3 font-medium text-white">
                      {r.scenarioTitle}
                    </td>
                    <td className="px-2 py-3">{statusBadge(r.reviewStatus)}</td>
                    <td className="px-2 py-3 max-w-xs truncate text-[var(--text-mute)]">
                      {r.userComment}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        className="cta-secondary h-8 px-3 rounded-md text-[12px] font-medium"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
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
