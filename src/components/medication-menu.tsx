'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAvailableMedications } from '@/stores/protocol-store';
import type { Medication } from '@/types/protocol';
import { ChevronDown, Pill } from 'lucide-react';

export function MedicationMenu(props: {
  onSelect?: (item: Medication) => void;
  disabled?: boolean;
}) {
  const { onSelect, disabled } = props;
  const meds = useAvailableMedications();

  if (!onSelect || meds.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 gap-1 bg-zinc-900 px-2 text-[10px] font-bold uppercase tracking-wide text-zinc-100 hover:bg-zinc-800"
          disabled={disabled}
        >
          <Pill className="size-3.5 shrink-0" aria-hidden />
          Meds
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[min(40vh,16rem)] overflow-y-auto">
        {meds.map((m) => (
          <DropdownMenuItem
            key={m.id}
            className="cursor-pointer text-sm"
            onClick={() => onSelect(m)}
          >
            {m.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
