'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  adminDismissProtocolImportReview,
  adminRescrubProtocolImport,
  adminSaveProtocolImportManual,
  type ProtocolImportScope,
} from '@/app/admin-protocol-import-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/supabase';
import { Loader2 } from 'lucide-react';
import type { Json } from '@/lib/supabase/database.types';

export type AdminProtocolImportSelection = {
  scope: ProtocolImportScope;
  id: string;
};

type ImportRow = {
  id: string;
  display_name: string;
  original_filename: string;
  status: string;
  extraction_error: string | null;
  extracted_interventions: Json | null;
  admin_review_notes: string | null;
  user_id?: string;
  workplace_id?: string;
  uploaded_by_user_id?: string;
};

export function AdminProtocolImportReviewDialog({
  open,
  onOpenChange,
  selected,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: AdminProtocolImportSelection | null;
  onDone: () => void;
}) {
  const client = useSupabase();
  const { toast } = useToast();
  const [isBusy, startTransition] = useTransition();
  const [row, setRow] = useState<ImportRow | null>(null);
  const [jsonDraft, setJsonDraft] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [resolutionMessage, setResolutionMessage] = useState(
    'We corrected your protocol import. Try activating it again or run a short simulation to confirm treatment tiles look right.',
  );

  useEffect(() => {
    if (!open || !selected || !client) {
      setRow(null);
      setJsonDraft('');
      setAdminNotes('');
      return;
    }

    const table = selected.scope === 'user' ? 'user_protocol_imports' : 'workplace_protocol_imports';
    let cancelled = false;
    void (async () => {
      const { data, error } = await client.from(table).select('*').eq('id', selected.id).maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setRow(null);
        toast({ variant: 'destructive', title: 'Could not load import', description: error?.message });
        return;
      }
      const r = data as unknown as ImportRow;
      setRow(r);
      setAdminNotes(r.admin_review_notes ?? '');
      setJsonDraft(JSON.stringify(r.extracted_interventions ?? [], null, 2));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selected, client]);

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    startTransition(() => {
      void (async () => {
        const res = await fn();
        if (res.ok) {
          toast({ title: 'Saved' });
          onDone();
          onOpenChange(false);
        } else {
          toast({ variant: 'destructive', title: 'Action failed', description: res.error });
        }
      })();
    });
  };

  if (!selected) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92dvh,880px)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Protocol import QA</DialogTitle>
          <DialogDescription>
            {selected.scope === 'user' ? 'Personal import' : 'Workplace shared import'} · Fix extraction, re-run the
            pipeline, or close the ticket with a learner message.
          </DialogDescription>
        </DialogHeader>

        {row ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="font-medium">{row.display_name}</p>
              <p className="truncate text-xs text-muted-foreground" title={row.original_filename}>
                {row.original_filename}
              </p>
              <p className="mt-1 text-muted-foreground">Status: {row.status}</p>
              {row.extraction_error ? (
                <p className="mt-2 whitespace-pre-wrap text-destructive">{row.extraction_error}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="res-msg">Message to learner (shown in Settings)</Label>
              <Textarea
                id="res-msg"
                value={resolutionMessage}
                onChange={(e) => setResolutionMessage(e.target.value)}
                rows={3}
                disabled={isBusy}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-notes">Internal admin notes (optional)</Label>
              <Input
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                disabled={isBusy}
                placeholder="For your team only"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="json-edit">Interventions JSON (manual edit)</Label>
              <Textarea
                id="json-edit"
                className="min-h-[200px] font-mono text-xs"
                value={jsonDraft}
                onChange={(e) => setJsonDraft(e.target.value)}
                disabled={isBusy}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isBusy || !row}
              onClick={() =>
                run(() => adminRescrubProtocolImport(selected.scope, selected.id, resolutionMessage))
              }
            >
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Re-scrub from PDF
            </Button>
            <Button
              type="button"
              disabled={isBusy || !row}
              onClick={() =>
                run(() =>
                  adminSaveProtocolImportManual(
                    selected.scope,
                    selected.id,
                    jsonDraft,
                    adminNotes,
                    resolutionMessage,
                  ),
                )
              }
            >
              Save manual JSON &amp; return
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="text-destructive"
            disabled={isBusy || !row}
            onClick={() =>
              run(() => adminDismissProtocolImportReview(selected.scope, selected.id, resolutionMessage))
            }
          >
            Close ticket (no auto-fix)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
