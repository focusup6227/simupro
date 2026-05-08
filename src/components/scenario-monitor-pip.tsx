'use client';

import { UnifiedCardiacMonitor } from '@/components/unified-cardiac-monitor';
import { useScenarioMonitorPipStore } from '@/stores/scenario-monitor-pip-store';
import { usePathname } from 'next/navigation';
import { useShallow } from 'zustand/shallow';

/**
 * Picture-in-picture monitor on the scenario catalog only. Keeps one live strip instance:
 * run page unmounts before this mounts (list navigation), so ECG/Capno pooled workers hand off cleanly.
 */
export function ScenarioMonitorPip() {
  const pathname = usePathname();
  const { scenario, cprActive, forcedRhythm, pulseless, simulationEnded } =
    useScenarioMonitorPipStore(
      useShallow((s) => ({
        scenario: s.scenario,
        cprActive: s.cprActive,
        forcedRhythm: s.forcedRhythm,
        pulseless: s.pulseless,
        simulationEnded: s.simulationEnded,
      })),
    );

  const onCatalog = pathname === '/dashboard/scenarios';

  if (!onCatalog) return null;
  if (!scenario || simulationEnded) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[min(100vw-2rem,380px)] max-h-[min(70vh,520px)] overflow-auto rounded-lg border border-zinc-600 bg-zinc-950/95 p-2 shadow-2xl ring-1 ring-emerald-900/40 backdrop-blur-sm"
      aria-label="Active simulation monitor"
    >
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-emerald-500/90">
        Live monitor · {scenario.title}
      </p>
      <UnifiedCardiacMonitor
        scenario={scenario}
        cprActive={cprActive}
        forcedRhythm={forcedRhythm}
        pulseless={pulseless}
      />
    </div>
  );
}
