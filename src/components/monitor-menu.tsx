'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useAvailableMedications,
  useAvailableProcedures,
} from '@/stores/protocol-store';
import type { Medication, Procedure } from '@/types/protocol';
import { ChevronDown, Crosshair, Pill, type LucideIcon } from 'lucide-react';

type MonitorMenuItem = { id: string; name: string };

type MonitorMenuProps<T extends MonitorMenuItem> = {
  /** Visible button text. */
  label: string;
  /** Lucide icon component for the trigger. */
  icon: LucideIcon;
  items: T[];
  onSelect?: (item: T) => void;
  disabled?: boolean;
};

function MonitorMenu<T extends MonitorMenuItem>({
  label,
  icon: Icon,
  items,
  onSelect,
  disabled,
}: MonitorMenuProps<T>) {
  if (!onSelect || items.length === 0) return null;

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
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {label}
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[min(40vh,16rem)] overflow-y-auto">
        {items.map((row) => (
          <DropdownMenuItem
            key={row.id}
            className="cursor-pointer text-sm"
            onClick={() => onSelect(row)}
          >
            {row.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MedicationMenu(props: {
  onSelect?: (item: Medication) => void;
  disabled?: boolean;
}) {
  const meds = useAvailableMedications();
  return (
    <MonitorMenu<Medication>
      label="Meds"
      icon={Pill}
      items={meds}
      onSelect={props.onSelect}
      disabled={props.disabled}
    />
  );
}

export function InterventionMenu(props: {
  onSelect?: (item: Procedure) => void;
  disabled?: boolean;
}) {
  const procs = useAvailableProcedures();
  return (
    <MonitorMenu<Procedure>
      label="Proc"
      icon={Crosshair}
      items={procs}
      onSelect={props.onSelect}
      disabled={props.disabled}
    />
  );
}
