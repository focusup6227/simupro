'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAvailableProcedures } from '@/stores/protocol-store';
import type { Procedure } from '@/types/protocol';
import { ChevronDown, Crosshair } from 'lucide-react';

export function InterventionMenu(props: {
  onSelect?: (item: Procedure) => void;
  disabled?: boolean;
}) {
  const { onSelect, disabled } = props;
  const items = useAvailableProcedures();

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
          <Crosshair className="size-3.5 shrink-0" aria-hidden />
          Proc
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
