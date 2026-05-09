'use client';

import type { LegacySupabaseIntervention } from '@/lib/types';
import type { Intervention as ProtocolIntervention } from '@/types/protocol';
import { isMedication } from '@/types/protocol';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export type TreatmentSelection = {
  selected: boolean;
  subOptions: Record<string, string>;
};

export type InterventionTileIntervention = LegacySupabaseIntervention | ProtocolIntervention;

function isLegacyTileIntervention(i: InterventionTileIntervention): i is LegacySupabaseIntervention {
  return 'certificationLevel' in i;
}

interface InterventionTileProps {
  intervention: InterventionTileIntervention;
  selected: TreatmentSelection | undefined;
  onToggle: (selected: boolean) => void;
  onSubOptionChange: (label: string, value: string) => void;
}

export function InterventionTile({
  intervention,
  selected,
  onToggle,
  onSubOptionChange,
}: InterventionTileProps) {
  const isOn = Boolean(selected?.selected);
  const subs = isLegacyTileIntervention(intervention) ? intervention.subOptions ?? [] : [];
  const showSubs = isOn && subs.length > 0;

  const subtitle = !isLegacyTileIntervention(intervention)
    ? isMedication(intervention)
      ? intervention.medicationData.dosages.adult
      : intervention.procedureData.parameters ?? intervention.procedureData.successCriteria
    : null;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={isOn}
      onClick={() => onToggle(!isOn)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(!isOn);
        }
      }}
      className={cn(
        'cursor-pointer border-2 p-3 text-left transition-colors',
        isOn
          ? 'border-emerald-500/70 bg-emerald-950/25 ring-1 ring-emerald-500/20'
          : 'border-border bg-card hover:bg-accent/40',
      )}
    >
      <div className="flex gap-2">
        <span
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
            isOn
              ? 'border-emerald-400 bg-emerald-500/90 text-black'
              : 'border-muted-foreground/40 bg-muted/30',
          )}
          aria-hidden
        >
          {isOn ? <Check className="size-3.5 stroke-[3]" /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{intervention.name}</p>
          {subtitle ? (
            <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
          {showSubs ? (
            <div
              className="mt-3 space-y-3 border-t border-border/80 pt-3"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {subs.map((so) => (
                  <div key={so.label} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {so.label}
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        onSubOptionChange(so.label, value)
                      }
                      value={
                        selected?.subOptions?.[so.label] ?? so.options[0]
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={`Select ${so.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {so.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
