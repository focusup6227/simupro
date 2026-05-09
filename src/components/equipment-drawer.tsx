import { usePhysiologyStore } from '@/stores/physiology-store';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border py-2 last:border-b-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function EquipmentDrawer() {
  const [open, setOpen] = useState(false);

  const {
    capnoSensor,
    isBpCuffApplied,
    isFourLeadApplied,
    isTwelveLeadElectrodesApplied,
    isPulseOxApplied,
    applyCapnoSensor,
    clearCapnoSensor,
    applyBpCuff,
    removeBpCuff,
    applyFourLead,
    removeFourLead,
    applyTwelveLeadElectrodes,
    removeTwelveLeadElectrodes,
    applyPulseOx,
    removePulseOx,
  } = usePhysiologyStore(
    useShallow((s) => ({
      capnoSensor: s.capnoSensor,
      isBpCuffApplied: s.isBpCuffApplied,
      isFourLeadApplied: s.isFourLeadApplied,
      isTwelveLeadElectrodesApplied: s.isTwelveLeadElectrodesApplied,
      isPulseOxApplied: s.isPulseOxApplied,
      applyCapnoSensor: s.applyCapnoSensor,
      clearCapnoSensor: s.clearCapnoSensor,
      applyBpCuff: s.applyBpCuff,
      removeBpCuff: s.removeBpCuff,
      applyFourLead: s.applyFourLead,
      removeFourLead: s.removeFourLead,
      applyTwelveLeadElectrodes: s.applyTwelveLeadElectrodes,
      removeTwelveLeadElectrodes: s.removeTwelveLeadElectrodes,
      applyPulseOx: s.applyPulseOx,
      removePulseOx: s.removePulseOx,
    })),
  );

  const chip = (on: boolean) =>
    cn(
      'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tabular-nums',
      on
        ? 'bg-emerald-950 text-emerald-400 ring-1 ring-emerald-700'
        : 'bg-muted text-muted-foreground',
    );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-left text-sm font-medium shadow-sm transition hover:bg-accent"
        >
          <span>Equipment</span>
          {open ? (
            <ChevronDown className="size-4 shrink-0 opacity-70" />
          ) : (
            <ChevronRight className="size-4 shrink-0 opacity-70" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-md border border-border bg-card px-3 py-2 shadow-sm">
          <Row label="Pulse oximeter">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={isPulseOxApplied ? 'secondary' : 'default'}
                onClick={() => applyPulseOx()}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!isPulseOxApplied}
                onClick={() => removePulseOx()}
              >
                Remove
              </Button>
              <span className={chip(isPulseOxApplied)}>
                {isPulseOxApplied ? 'Applied' : 'Off'}
              </span>
            </div>
          </Row>

          <Row label="NIBP cuff">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={isBpCuffApplied ? 'secondary' : 'default'}
                onClick={() => applyBpCuff()}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!isBpCuffApplied}
                onClick={() => removeBpCuff()}
              >
                Remove
              </Button>
              <span className={chip(isBpCuffApplied)}>
                {isBpCuffApplied ? 'Applied' : 'Off'}
              </span>
            </div>
          </Row>

          <Row label="EtCO₂ sensor">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={capnoSensor === 'nasal' ? 'secondary' : 'outline'}
                onClick={() => applyCapnoSensor('nasal')}
              >
                Nasal
              </Button>
              <Button
                size="sm"
                variant={capnoSensor === 'inline' ? 'secondary' : 'outline'}
                onClick={() => applyCapnoSensor('inline')}
              >
                In-line
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={capnoSensor == null}
                onClick={() => clearCapnoSensor()}
              >
                Clear
              </Button>
              <span className={chip(capnoSensor != null)}>
                {capnoSensor === 'nasal'
                  ? 'Nasal'
                  : capnoSensor === 'inline'
                    ? 'In-line'
                    : 'Off'}
              </span>
            </div>
          </Row>

          <Row label="4-lead monitoring">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={isFourLeadApplied ? 'secondary' : 'default'}
                onClick={() => applyFourLead()}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!isFourLeadApplied}
                onClick={() => removeFourLead()}
              >
                Remove
              </Button>
              <span className={chip(isFourLeadApplied)}>
                {isFourLeadApplied ? 'Applied' : 'Off'}
              </span>
            </div>
          </Row>

          <Row label="12-lead electrodes">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={
                  isTwelveLeadElectrodesApplied ? 'secondary' : 'default'
                }
                onClick={() => applyTwelveLeadElectrodes()}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!isTwelveLeadElectrodesApplied}
                onClick={() => removeTwelveLeadElectrodes()}
              >
                Remove
              </Button>
              <span className={chip(isTwelveLeadElectrodesApplied)}>
                {isTwelveLeadElectrodesApplied ? 'Applied' : 'Off'}
              </span>
            </div>
          </Row>

          <p className="pt-2 text-[11px] text-muted-foreground">
            Matches treatment selections: use the bezel on the monitor for NIBP
            cycles, EtCO₂ / ECG channels, and 12-lead acquisition.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
