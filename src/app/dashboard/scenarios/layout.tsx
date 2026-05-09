import { ScenarioMonitorPip } from '@/components/scenario-monitor-pip';
import { ScenarioSoundsBootstrap } from '@/components/scenario-sounds-bootstrap';
import type { ReactNode } from 'react';

export default function ScenariosLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <ScenarioSoundsBootstrap />
      <ScenarioMonitorPip />
      {children}
    </>
  );
}
