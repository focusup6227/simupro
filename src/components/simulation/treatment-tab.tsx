'use client';

import type { LegacySupabaseIntervention } from '@/lib/types';
import { isMedication } from '@/types/protocol';
import { isTypedDoseSubOptionLabel } from '@/lib/intervention-dose-ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ArrowRight, AlertTriangle, Ban } from 'lucide-react';
import {
  InterventionTile,
  type InterventionTileIntervention,
  type TreatmentSelection,
} from '@/components/intervention-tile';

export type TreatmentSelections = Record<string, TreatmentSelection>;

function isLegacy(
  i: InterventionTileIntervention,
): i is LegacySupabaseIntervention {
  return 'certificationLevel' in i;
}

/**
 * Mirrors the submit-time dose validation in the scenario page so a tile can be
 * flagged *before* the user hits submit. A selected medication (protocol) needs
 * a `Dosage` value; a legacy intervention needs every typed-dose sub-option
 * filled in. Keeping this in lockstep with `handleSubmitTreatments` is what
 * makes the submit button's state honest instead of silently dead.
 */
export function selectionNeedsDose(
  intervention: InterventionTileIntervention,
  selection: TreatmentSelection | undefined,
): boolean {
  if (!selection?.selected) return false;
  if (!isLegacy(intervention)) {
    if (isMedication(intervention)) {
      return !selection.subOptions?.Dosage?.trim();
    }
    return false;
  }
  for (const so of intervention.subOptions ?? []) {
    if (!isTypedDoseSubOptionLabel(so.label)) continue;
    if (!selection.subOptions?.[so.label]?.trim()) return true;
  }
  return false;
}

interface TreatmentTabProps {
  /** Heading above the tile grid, e.g. "Select treatments to administer". */
  title: string;
  interventions: InterventionTileIntervention[];
  selected: TreatmentSelections;
  onToggle: (id: string, selected: boolean) => void;
  onSubOptionChange: (id: string, label: string, value: string) => void;
  onSubmit: () => void;
  /** AI request in flight — button shows a spinner label and locks. */
  isLoading: boolean;
  /** Structured interventions enabled for this scenario. */
  enabled: boolean;
  /**
   * A non-null reason disables submission and is shown to the user verbatim
   * (e.g. "Simulation has ended"). This is the antidote to the old
   * "button silently does nothing" behavior.
   */
  disabledReason: string | null;
  submitLabel: string;
  /** Shown when there are no interventions in scope for the user's level. */
  emptyMessage: string;
}

export function TreatmentTab({
  title,
  interventions,
  selected,
  onToggle,
  onSubOptionChange,
  onSubmit,
  isLoading,
  enabled,
  disabledReason,
  submitLabel,
  emptyMessage,
}: TreatmentTabProps) {
  const selectedCount = interventions.reduce(
    (n, i) => (selected[i.id]?.selected ? n + 1 : n),
    0,
  );
  const needsDoseCount = interventions.reduce(
    (n, i) => (selectionNeedsDose(i, selected[i.id]) ? n + 1 : n),
    0,
  );

  const blocked =
    !enabled || isLoading || disabledReason !== null || selectedCount === 0 || needsDoseCount > 0;

  // A single, always-rendered status line so the control is never a mystery.
  let status: { tone: 'muted' | 'warn' | 'ready'; text: string } | null = null;
  if (!enabled) {
    status = { tone: 'muted', text: 'Structured interventions are disabled for this scenario.' };
  } else if (disabledReason) {
    status = { tone: 'muted', text: disabledReason };
  } else if (isLoading) {
    status = { tone: 'muted', text: 'Processing your last action…' };
  } else if (selectedCount === 0) {
    status = { tone: 'muted', text: 'Select at least one treatment to enable submission.' };
  } else if (needsDoseCount > 0) {
    status = {
      tone: 'warn',
      text: `Enter a dose for ${needsDoseCount} highlighted medication${needsDoseCount > 1 ? 's' : ''} before submitting.`,
    };
  } else {
    status = {
      tone: 'ready',
      text: `${selectedCount} treatment${selectedCount > 1 ? 's' : ''} ready to submit.`,
    };
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 outline-none">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {selectedCount > 0 ? (
          <Badge variant="secondary" className="shrink-0">
            {selectedCount} selected
          </Badge>
        ) : null}
      </div>

      {!enabled ? (
        <p className="text-sm text-muted-foreground">
          Structured protocol interventions are disabled for this scenario. Use the
          Assessment and other tabs to document care.
        </p>
      ) : interventions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ScrollArea className="min-h-0 flex-1 pr-3">
          <div className="grid grid-cols-1 gap-3 pr-1 sm:grid-cols-2 xl:grid-cols-3">
            {interventions.map((t) => (
              <InterventionTile
                key={t.id}
                intervention={t}
                selected={selected[t.id]}
                needsDose={selectionNeedsDose(t, selected[t.id])}
                onToggle={(sel) => onToggle(t.id, sel)}
                onSubOptionChange={(label, value) =>
                  onSubOptionChange(t.id, label, value)
                }
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Sticky action footer — always visible, never clipped below the fold. */}
      <div className="shrink-0 space-y-2 border-t border-border/60 pt-3">
        {status ? (
          <p
            className={cn(
              'flex items-center gap-1.5 text-xs',
              status.tone === 'warn' && 'text-amber-500',
              status.tone === 'ready' && 'text-emerald-500',
              status.tone === 'muted' && 'text-muted-foreground',
            )}
          >
            {status.tone === 'warn' ? (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            ) : status.tone === 'muted' && (disabledReason || !enabled) ? (
              <Ban className="h-3.5 w-3.5 shrink-0" />
            ) : null}
            {status.text}
          </p>
        ) : null}
        <Button onClick={onSubmit} disabled={blocked} className="w-full">
          {isLoading ? 'Processing…' : submitLabel}
          {!isLoading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
        </Button>
      </div>
    </div>
  );
}
