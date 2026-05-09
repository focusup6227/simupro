'use client';

import { preloadMonitorSounds } from '@/lib/monitor-sound-preload';
import { useEffect } from 'react';

/** Runs once per scenarios subtree mount (list + run + report). */
export function ScenarioSoundsBootstrap() {
  useEffect(() => {
    preloadMonitorSounds();
  }, []);
  return null;
}
