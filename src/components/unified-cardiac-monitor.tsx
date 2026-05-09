'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CardiacCanvas } from '@/components/cardiac-canvas';
import { CapnoWaveCanvas } from '@/components/capno-wave-canvas';
import {
  deriveEcgScenarioContext,
} from '@/lib/ecg-scenario';
import type { EcgRhythmKind } from '@/lib/ecg-rhythm';
import {
  LIVE_STRIP_VIEWPORT_PX,
  sweepDurationSec,
} from '@/lib/ecg-sweep-geometry';
import { rhythmStripeWidthForContext } from '@/lib/ecg-waveform';
import {
  formatEtco2ForMonitor,
  formatSpo2ForMonitor,
  parseHeartRateBpm,
} from '@/lib/vitals-parse';
import { useMergedPkDisplay } from '@/hooks/use-merged-pk-display';
import {
  Activity,
  Battery,
  Camera,
  FileText,
  Heart,
  Loader2,
  Power,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type ReactNode,
} from 'react';
import { useShallow } from 'zustand/shallow';
import {
  RhythmStripPaper,
  SavedTracingsList,
  TwelveLeadPaper,
  type EcgAcquisition,
} from '@/components/ecg-monitor';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usePhysiologyStore } from '@/stores/physiology-store';
import { InterventionMenu, MedicationMenu } from '@/components/monitor-menu';
import type { Scenario } from '@/lib/types';
import type { Medication, Procedure } from '@/types/protocol';

function uid() {
  return `ucm-${Math.random().toString(36).slice(2, 10)}`;
}

const COLOR_HR = '#00FF00';
const COLOR_SPO2 = '#00FFFF';
const COLOR_ETCO2 = '#FFFF00';
const COLOR_BP = '#FFFFFF';

/** PALS-style severe brady / tachy for monitor alarm (tunable). */
function severeHrAlarmThresholds(
  ageBand: Scenario['ageBand'],
): { brady: number; tachy: number } {
  switch (ageBand) {
    case 'neonate':
      return { brady: 100, tachy: 200 };
    case 'infant':
      return { brady: 90, tachy: 180 };
    case 'toddler':
      return { brady: 80, tachy: 170 };
    case 'child':
      return { brady: 60, tachy: 160 };
    case 'adolescent':
    case 'pediatric':
      return { brady: 50, tachy: 150 };
    case 'adult':
    default:
      return { brady: 50, tachy: 150 };
  }
}

function playAlarmChirp(actx: AudioContext) {
  const t0 = actx.currentTime;
  for (let i = 0; i < 2; i++) {
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === 0 ? 660 : 880;
    g.gain.value = 0.06;
    osc.connect(g);
    g.connect(actx.destination);
    const start = t0 + i * 0.09;
    osc.start(start);
    osc.stop(start + 0.08);
  }
}

function vitalRowClass() {
  return 'relative flex min-h-[4.5rem] flex-col justify-center border-b border-zinc-800/90 px-2 py-2 font-mono ring-1 ring-inset ring-white/[0.04]';
}

function ChannelLed({ on, color }: { on: boolean; color: string }) {
  return (
    <span
      className={cn(
        'mr-1 inline-block size-1.5 shrink-0 rounded-full transition-colors',
        on ? 'shadow-[0_0_5px_currentColor]' : 'bg-zinc-600',
      )}
      style={on ? { backgroundColor: color, color } : undefined}
      aria-hidden
    />
  );
}

function VitalBlockHr({ displayHr }: { displayHr?: string }) {
  const {
    hr,
    isMonitorPowered,
    isPulseOxApplied,
    isFourLeadApplied,
    isMonitorPadsApplied,
    isEkgChannelOn,
  } = usePhysiologyStore(
    useShallow((s) => ({
      hr: s.hr,
      isMonitorPowered: s.isMonitorPowered,
      isPulseOxApplied: s.isPulseOxApplied,
      isFourLeadApplied: s.isFourLeadApplied,
      isMonitorPadsApplied: s.isMonitorPadsApplied,
      isEkgChannelOn: s.isEkgChannelOn,
    })),
  );
  const channelOn =
    isMonitorPowered &&
    (isPulseOxApplied ||
      ((isFourLeadApplied || isMonitorPadsApplied) && isEkgChannelOn));
  const display = channelOn ? (displayHr ?? hr) || '—' : '—';

  return (
    <div className={vitalRowClass()}>
      <span className="absolute left-1 top-1 flex items-center text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        <ChannelLed on={channelOn} color={COLOR_HR} />
        HR
      </span>
      <span
        className="pt-4 text-right text-3xl font-bold tabular-nums leading-none"
        style={{ color: COLOR_HR }}
      >
        {display}
      </span>
    </div>
  );
}

function VitalBlockSpo2({ displaySpo2 }: { displaySpo2?: string }) {
  const { spo2, isMonitorPowered, isPulseOxApplied } = usePhysiologyStore(
    useShallow((s) => ({
      spo2: s.spo2,
      isMonitorPowered: s.isMonitorPowered,
      isPulseOxApplied: s.isPulseOxApplied,
    })),
  );
  const channelOn = isMonitorPowered && isPulseOxApplied;
  const text = channelOn ? formatSpo2ForMonitor(displaySpo2 ?? spo2) || '—' : '—';

  return (
    <div className={vitalRowClass()}>
      <span className="absolute left-1 top-1 flex items-center text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        <ChannelLed on={channelOn} color={COLOR_SPO2} />
        SpO₂
      </span>
      <span
        className="pt-4 text-right text-3xl font-bold tabular-nums leading-none"
        style={{ color: COLOR_SPO2 }}
      >
        {text}
      </span>
    </div>
  );
}

function VitalBlockEtco2({ displayEtco2 }: { displayEtco2?: string }) {
  const { capnoSensor, isEtco2ChannelOn, etco2, isMonitorPowered } =
    usePhysiologyStore(
      useShallow((s) => ({
        capnoSensor: s.capnoSensor,
        isEtco2ChannelOn: s.isEtco2ChannelOn,
        etco2: s.etco2,
        isMonitorPowered: s.isMonitorPowered,
      })),
    );

  const live =
    isMonitorPowered && capnoSensor != null && isEtco2ChannelOn;
  let main: string;
  let sub: string | null = null;
  if (!isMonitorPowered) {
    main = '—';
  } else if (live) {
    main = formatEtco2ForMonitor(displayEtco2 ?? etco2);
  } else if (!capnoSensor && !isEtco2ChannelOn) {
    main = '—';
  } else if (capnoSensor && !isEtco2ChannelOn) {
    main = 'OFF';
  } else {
    main = 'CHECK';
    sub = 'SENSOR';
  }

  return (
    <div className={vitalRowClass()}>
      <span className="absolute left-1 top-1 flex items-center text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        <ChannelLed on={live} color={COLOR_ETCO2} />
        EtCO₂
      </span>
      <span
        className={cn(
          'pt-4 text-right font-bold tabular-nums leading-none',
          sub ? 'text-2xl' : 'text-3xl',
        )}
        style={{ color: COLOR_ETCO2 }}
      >
        {main}
      </span>
      {sub ? (
        <span className="text-right text-[10px] font-semibold uppercase tracking-wide text-yellow-500/90">
          {sub}
        </span>
      ) : null}
    </div>
  );
}

function VitalBlockBp() {
  const st = usePhysiologyStore(
    useShallow((s) => ({
      nibpPhase: s.nibpPhase,
      bpDisplaySys: s.bpDisplaySys,
      bpDisplayDia: s.bpDisplayDia,
      isMonitorPowered: s.isMonitorPowered,
    })),
  );

  let inner: ReactNode;

  if (!st.isMonitorPowered) {
    inner = (
      <span
        className="pt-4 text-right text-3xl font-bold tabular-nums leading-none"
        style={{ color: COLOR_BP }}
      >
        —/—
      </span>
    );
  } else if (st.nibpPhase === 'check_cuff') {
    inner = (
      <span className="pt-4 text-right text-lg font-bold leading-none tracking-tight text-amber-300">
        CHECK CUFF
      </span>
    );
  } else if (st.nibpPhase === 'inflating') {
    inner = (
      <div className="flex flex-col items-end gap-1.5 pt-3">
        <Loader2
          className="size-7 animate-spin"
          style={{ color: COLOR_BP }}
          aria-hidden
        />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          INFLATING…
        </span>
      </div>
    );
  } else if (st.bpDisplaySys != null && st.bpDisplayDia != null) {
    const ms = Math.round(
      Math.min(260, Math.max(30, st.bpDisplaySys)),
    );
    const md = Math.round(
      Math.min(180, Math.max(20, st.bpDisplayDia)),
    );
    inner = (
      <span
        className="pt-4 text-right text-3xl font-bold tabular-nums leading-none"
        style={{ color: COLOR_BP }}
      >
        {ms}/{md}
      </span>
    );
  } else {
    inner = (
      <span
        className="pt-4 text-right text-3xl font-bold tabular-nums leading-none"
        style={{ color: COLOR_BP }}
      >
        —/—
      </span>
    );
  }

  const bpChannelOn =
    st.isMonitorPowered &&
    (st.nibpPhase === 'inflating' ||
      st.nibpPhase === 'check_cuff' ||
      (st.bpDisplaySys != null && st.bpDisplayDia != null));

  return (
    <div className={vitalRowClass()}>
      <span className="absolute left-1 top-1 flex items-center text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        <ChannelLed on={bpChannelOn} color={COLOR_BP} />
        BP
      </span>
      {inner}
    </div>
  );
}

const PulseHeartImpl = memo(function PulseHeartImpl({
  displayHr,
  scenario,
}: {
  displayHr?: string;
  scenario?: Scenario | null;
}) {
  const {
    hr,
    isPulseless,
    isMonitorPowered,
    isPulseOxApplied,
    isFourLeadApplied,
    isMonitorPadsApplied,
    isEkgChannelOn,
    isBeepMuted,
  } = usePhysiologyStore(
    useShallow((s) => ({
      hr: s.hr,
      isPulseless: s.isPulseless,
      isMonitorPowered: s.isMonitorPowered,
      isPulseOxApplied: s.isPulseOxApplied,
      isFourLeadApplied: s.isFourLeadApplied,
      isMonitorPadsApplied: s.isMonitorPadsApplied,
      isEkgChannelOn: s.isEkgChannelOn,
      isBeepMuted: s.isBeepMuted,
    })),
  );
  const [flash, setFlash] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const reduceMotionRef = useRef(false);
  const tabVisibleRef = useRef(
    typeof document !== 'undefined' &&
      document.visibilityState === 'visible',
  );

  const showPulse =
    isMonitorPowered &&
    !isPulseless &&
    (isPulseOxApplied ||
      ((isFourLeadApplied || isMonitorPadsApplied) && isEkgChannelOn));

  useEffect(() => {
    const onVis = () => {
      tabVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    reduceMotionRef.current = mq?.matches ?? false;
    const fn = (e: MediaQueryListEvent) => {
      reduceMotionRef.current = e.matches;
    };
    mq?.addEventListener('change', fn);
    return () => mq?.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    if (!showPulse || reduceMotionRef.current) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible')
      return;

    const hrLine = displayHr ?? hr;
    const bpm = parseHeartRateBpm(hrLine);
    if (!bpm || bpm <= 0) return;

    const ms = Math.round(60000 / bpm);
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible')
        return;
      setFlash(true);
      window.setTimeout(() => setFlash(false), 120);
    }, ms);

    return () => clearInterval(id);
  }, [displayHr, hr, isPulseless, showPulse]);

  useEffect(() => {
    if (!showPulse || reduceMotionRef.current || isBeepMuted) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible')
      return;

    const hrLine = displayHr ?? hr;
    const bpm = parseHeartRateBpm(hrLine);
    if (!bpm || bpm <= 0) return;

    const { brady, tachy } = severeHrAlarmThresholds(scenario?.ageBand);
    const alarmOn = bpm < brady || bpm > tachy;
    if (!alarmOn) return;

    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible')
        return;
      if (!tabVisibleRef.current || reduceMotionRef.current) return;
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctx) return;
        const actx = audioCtxRef.current ?? new Ctx();
        audioCtxRef.current = actx;
        if (actx.state === 'suspended') void actx.resume();
        playAlarmChirp(actx);
      } catch {
        /* autoplay / blocked */
      }
    }, 1500);

    return () => clearInterval(id);
  }, [
    displayHr,
    hr,
    isPulseless,
    showPulse,
    isBeepMuted,
    scenario?.ageBand,
  ]);

  if (isPulseless || !showPulse) return null;

  return (
    <div className="flex items-center justify-center py-2">
      <Heart
        className="size-8 transition-opacity duration-75"
        style={{
          color: COLOR_HR,
          opacity: flash ? 1 : 0.35,
          filter: flash ? 'drop-shadow(0 0 6px #00ff00)' : undefined,
        }}
        aria-hidden
      />
    </div>
  );
});

function MonitorHardwareBezel(props: {
  onTwelveLead: () => void;
  twelveLeadDisabled: boolean;
}) {
  const {
    nibpPhase,
    isEtco2ChannelOn,
    isEkgChannelOn,
    isFourLeadApplied,
    isMonitorPadsApplied,
    requestNibpCycle,
    toggleEtco2Channel,
    toggleEkgChannel,
    isMonitorPowered,
    togglePowerMonitor,
    isBeepMuted,
    toggleBeepMute,
  } = usePhysiologyStore(
    useShallow((s) => ({
      nibpPhase: s.nibpPhase,
      isEtco2ChannelOn: s.isEtco2ChannelOn,
      isEkgChannelOn: s.isEkgChannelOn,
      isFourLeadApplied: s.isFourLeadApplied,
      isMonitorPadsApplied: s.isMonitorPadsApplied,
      requestNibpCycle: s.requestNibpCycle,
      toggleEtco2Channel: s.toggleEtco2Channel,
      toggleEkgChannel: s.toggleEkgChannel,
      isMonitorPowered: s.isMonitorPowered,
      togglePowerMonitor: s.togglePowerMonitor,
      isBeepMuted: s.isBeepMuted,
      toggleBeepMute: s.toggleBeepMute,
    })),
  );

  const powerLit =
    'ring-2 ring-emerald-500/65 shadow-[inset_0_0_14px_rgba(52,211,153,0.18)]';
  const nibpBusy = nibpPhase === 'inflating' || nibpPhase === 'check_cuff';
  const bezelDisabled = !isMonitorPowered;

  const rubber =
    'rounded-lg border border-zinc-600 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-100 shadow-[inset_0_2px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.4)] transition active:translate-y-px disabled:pointer-events-none disabled:opacity-35';

  const lit =
    'ring-2 ring-cyan-400/55 shadow-[inset_0_0_12px_rgba(34,211,238,0.15)]';

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/90 pt-2">
      <button
        type="button"
        className={cn(rubber, isMonitorPowered && powerLit)}
        onClick={() => togglePowerMonitor()}
        aria-pressed={isMonitorPowered}
      >
        <Power className="mx-auto mb-0.5 size-3.5" aria-hidden />
        PWR
      </button>
      <button
        type="button"
        className={cn(rubber, isBeepMuted && lit)}
        onClick={() => toggleBeepMute()}
        aria-pressed={isBeepMuted}
        title={isBeepMuted ? 'Unmute monitor tones' : 'Mute monitor tones'}
      >
        {isBeepMuted ? (
          <VolumeX className="mx-auto mb-0.5 size-3.5" aria-hidden />
        ) : (
          <Volume2 className="mx-auto mb-0.5 size-3.5" aria-hidden />
        )}
        MUTE
      </button>
      <button
        type="button"
        className={cn(rubber, nibpBusy && lit)}
        disabled={bezelDisabled}
        onClick={() => requestNibpCycle()}
      >
        NIBP
      </button>
      <button
        type="button"
        className={cn(rubber, isEtco2ChannelOn && lit)}
        disabled={bezelDisabled}
        onClick={() => toggleEtco2Channel()}
      >
        EtCO₂
      </button>
      <button
        type="button"
        className={cn(rubber, isEkgChannelOn && lit)}
        disabled={
          bezelDisabled || (!isFourLeadApplied && !isMonitorPadsApplied)
        }
        onClick={() => toggleEkgChannel()}
      >
        ECG
      </button>
      {props.twelveLeadDisabled ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <button
                type="button"
                className={cn(rubber)}
                disabled
              >
                12-Lead
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[14rem]">
            Apply 12-lead electrodes before acquiring.
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          type="button"
          className={cn(rubber)}
          disabled={bezelDisabled}
          onClick={() => props.onTwelveLead()}
        >
          12-Lead
        </button>
      )}
      <button type="button" className={rubber} disabled title="Not available in this build">
        Sync
      </button>
    </div>
  );
}

export function PulseHeart(props: {
  displayHr?: string;
  scenario?: Scenario | null;
}) {
  return (
    <PulseHeartImpl displayHr={props.displayHr} scenario={props.scenario} />
  );
}

type MonitorMode = 'four_lead' | 'twelve_lead';

export interface UnifiedCardiacMonitorProps {
  scenario?: Scenario | null;
  cprActive?: boolean;
  forcedRhythm?: EcgRhythmKind | null;
  /** Pulseless rhythm for ECG derivation (matches legacy `EcgMonitor`). */
  pulseless?: boolean;
  onRhythmChange?: (kind: EcgRhythmKind) => void;
  /** ECG / monitor chronology entries (rhythm strip, 12-lead, etc.). */
  onAction?: (label: string) => void;
  /** Monitor “Meds” menu — protocol catalog + scenario overlay. */
  onMonitorMedication?: (item: Medication) => void;
  /** Monitor “Proc” menu */
  onMonitorIntervention?: (item: Procedure) => void;
}

export function UnifiedCardiacMonitor({
  scenario,
  cprActive,
  forcedRhythm,
  pulseless,
  onRhythmChange,
  onAction,
  onMonitorMedication,
  onMonitorIntervention,
}: UnifiedCardiacMonitorProps) {
  const { merged } = useMergedPkDisplay();

  const vitalsForDerive = useMemo(
    () => ({
      hr: merged.hr,
      bp: merged.bp,
      rr: merged.rr,
      spo2: merged.spo2,
    }),
    [merged.hr, merged.bp, merged.rr, merged.spo2],
  );

  const ctx = useMemo(() => {
    const currentVitals = vitalsForDerive.hr
      ? {
          hr: vitalsForDerive.hr,
          bp: vitalsForDerive.bp,
          rr: vitalsForDerive.rr,
          spo2: vitalsForDerive.spo2,
        }
      : null;
    return deriveEcgScenarioContext({
      scenario: scenario ?? null,
      currentVitals,
      cprActive,
      forcedRhythm: forcedRhythm ?? null,
      pulseless,
    });
  }, [
    scenario,
    vitalsForDerive,
    cprActive,
    forcedRhythm,
    pulseless,
  ]);

  const lastKindRef = useRef<EcgRhythmKind | null>(null);
  useEffect(() => {
    if (lastKindRef.current !== ctx.kind) {
      lastKindRef.current = ctx.kind;
      onRhythmChange?.(ctx.kind);
    }
  }, [ctx.kind, onRhythmChange]);

  const tileW = useMemo(() => rhythmStripeWidthForContext(ctx), [ctx]);

  const [mode, setMode] = useState<MonitorMode>('four_lead');
  const [acquisitions, setAcquisitions] = useState<EcgAcquisition[]>([]);
  const [enlargedId, setEnlargedId] = useState<string | null>(null);

  const monitorStartTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (monitorStartTimeRef.current === null) {
      monitorStartTimeRef.current = Date.now();
    }
  }, []);

  const captureOffset = () => {
    const start = monitorStartTimeRef.current ?? Date.now();
    const cycleMs = sweepDurationSec(LIVE_STRIP_VIEWPORT_PX) * 1000;
    const elapsed = Date.now() - start;
    const phaseMs = ((elapsed % cycleMs) + cycleMs) % cycleMs;
    return (phaseMs / cycleMs) * LIVE_STRIP_VIEWPORT_PX;
  };

  const takeRhythmStrip = useCallback(() => {
    const ac: EcgAcquisition = {
      id: uid(),
      kind: 'rhythm-strip',
      takenAt: new Date(),
      ctx,
      startOffsetPx: captureOffset(),
    };
    setAcquisitions((a) => [ac, ...a]);
    setEnlargedId(ac.id);
    onAction?.('Saved rhythm-strip snapshot');
  }, [ctx, onAction]);

  const acquireTwelveLead = useCallback(() => {
    const ac: EcgAcquisition = {
      id: uid(),
      kind: 'twelve-lead',
      takenAt: new Date(),
      ctx,
      startOffsetPx: captureOffset(),
    };
    setAcquisitions((a) => [ac, ...a]);
    setMode('twelve_lead');
    onAction?.('Acquired 12-lead ECG');
  }, [ctx, onAction]);

  const isMonitorPowered = usePhysiologyStore((s) => s.isMonitorPowered);
  const { isFourLeadApplied, isMonitorPadsApplied, isEkgChannelOn } =
    usePhysiologyStore(
      useShallow((s) => ({
        isFourLeadApplied: s.isFourLeadApplied,
        isMonitorPadsApplied: s.isMonitorPadsApplied,
        isEkgChannelOn: s.isEkgChannelOn,
      })),
    );
  const stripLeadsOff =
    !(isFourLeadApplied || isMonitorPadsApplied) || !isEkgChannelOn;
  const stripOff = !isMonitorPowered || stripLeadsOff;
  const ecgLeadLabel = isFourLeadApplied ? 'II' : 'PADS';
  const capnoLive = usePhysiologyStore(
    (s) => s.capnoSensor != null && s.isEtco2ChannelOn,
  );
  const isTwelveLeadElectrodesApplied = usePhysiologyStore(
    (s) => s.isTwelveLeadElectrodesApplied,
  );

  const [twelveLeadAcquireBusy, setTwelveLeadAcquireBusy] = useState(false);
  const twelveLeadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (twelveLeadTimerRef.current != null) {
        clearTimeout(twelveLeadTimerRef.current);
      }
    };
  }, []);

  const beginTwelveLeadAcquire = useCallback(() => {
    if (!usePhysiologyStore.getState().isTwelveLeadElectrodesApplied) return;
    if (twelveLeadTimerRef.current != null) {
      clearTimeout(twelveLeadTimerRef.current);
    }
    setTwelveLeadAcquireBusy(true);
    twelveLeadTimerRef.current = setTimeout(() => {
      acquireTwelveLead();
      setTwelveLeadAcquireBusy(false);
      twelveLeadTimerRef.current = null;
    }, 10000);
  }, [acquireTwelveLead]);

  const enlarged = enlargedId
    ? acquisitions.find((a) => a.id === enlargedId) ?? null
    : null;
  const latestPrintout = acquisitions.find((a) => a.kind === 'twelve-lead');

  /** Clock must not read `Date` during SSR initial render — server vs client seconds differ and break hydration. */
  const [statusTime, setStatusTime] = useState<string | null>(null);
  const isBpCuffApplied = usePhysiologyStore((s) => s.isBpCuffApplied);

  useEffect(() => {
    if (!isBpCuffApplied || !isMonitorPowered) return;
    const scheduleCycle = () => {
      const s = usePhysiologyStore.getState();
      if (s.nibpPhase === 'inflating' || s.nibpPhase === 'check_cuff') return;
      s.requestNibpCycle();
    };
    scheduleCycle();
    const id = window.setInterval(scheduleCycle, 120_000);
    return () => clearInterval(id);
  }, [isBpCuffApplied, isMonitorPowered]);

  useEffect(() => {
    const tick = () => {
      setStatusTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const shellGridStyle = {
    backgroundColor: '#000000',
    contain: 'layout paint',
    backgroundImage: `
      linear-gradient(rgba(0, 55, 0, 0.45) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 55, 0, 0.45) 1px, transparent 1px),
      linear-gradient(rgba(0, 80, 0, 0.35) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 80, 0, 0.35) 1px, transparent 1px)
    `,
    backgroundSize: '24px 24px, 24px 24px, 6px 6px, 6px 6px',
  } as const;

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-zinc-600/90 bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_18px_rgba(0,0,0,0.5)] ring-1 ring-black/45">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-700/60 bg-black/35 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
          <span className="font-semibold text-emerald-400/90">SIMU-PRO</span>
          <span className="tabular-nums text-zinc-300">
            {statusTime ?? '--:--:--'}
          </span>
          <span className="flex items-center gap-0.5 text-zinc-400">
            <Battery className="size-3 shrink-0 text-emerald-500" aria-hidden />
            BATT
          </span>
        </div>
        <div
          className="relative overflow-hidden rounded-md border border-black/50 bg-black shadow-inner ring-1 ring-zinc-700/35"
          style={shellGridStyle}
        >
          <div
            className="pointer-events-none absolute inset-0 z-[4] opacity-[0.035] motion-reduce:hidden [background:repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.18)_3px)]"
            aria-hidden
          />
        <div className="relative z-[1] grid min-h-[280px] grid-cols-[3fr_1fr] gap-0 divide-x divide-zinc-800/90">
          <div className="relative flex min-w-0 flex-col gap-1 p-2">
            {twelveLeadAcquireBusy ? (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-[1px]">
                <Loader2 className="mb-2 size-10 animate-spin text-emerald-400" />
                <span className="font-mono text-xs uppercase tracking-[0.35em] text-emerald-100 sm:text-sm">
                  ACQUIRING…
                </span>
              </div>
            ) : null}
            {mode === 'four_lead' && (
              <>
                <div className="relative min-h-0">
                  <CardiacCanvas
                    ctx={ctx}
                    tileW={tileW}
                    leadIdx={1}
                    leadLabel={ecgLeadLabel}
                    height={176}
                    paused={!isMonitorPowered}
                    leadsOff={stripOff}
                  />
                  {!isMonitorPowered ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55">
                      <span className="rounded bg-black/85 px-3 py-1 font-mono text-xs tracking-[0.25em] text-amber-200 shadow-lg ring-1 ring-amber-700/50 sm:text-sm">
                        POWER OFF
                      </span>
                    </div>
                  ) : stripLeadsOff ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                      <span className="rounded bg-black/80 px-3 py-1 font-mono text-xs tracking-[0.25em] text-emerald-400 shadow-lg ring-1 ring-emerald-700/45 sm:text-sm">
                        LEADS OFF
                      </span>
                    </div>
                  ) : null}
                </div>
                <CapnoWaveCanvas
                  height={52}
                  enabled={capnoLive && isMonitorPowered}
                  etco2MmHg={merged.etco2MmHg}
                  obstructionFactor={merged.obstruction}
                  rrOverrideBpm={
                    merged.ventilationMode === 'bvm' && merged.assistedRateBpm != null
                      ? merged.assistedRateBpm
                      : undefined
                  }
                />
                <TooltipProvider delayDuration={350}>
                  <MonitorHardwareBezel
                    onTwelveLead={beginTwelveLeadAcquire}
                    twelveLeadDisabled={!isTwelveLeadElectrodesApplied}
                  />
                </TooltipProvider>
                {isMonitorPowered &&
                (onMonitorMedication || onMonitorIntervention || onAction) ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <MedicationMenu
                      onSelect={onMonitorMedication ?? undefined}
                      disabled={!isMonitorPowered}
                    />
                    <InterventionMenu
                      onSelect={
                        onMonitorIntervention
                          ? onMonitorIntervention
                          : onAction
                            ? (p) =>
                                onAction(
                                  p.procedureData.parameters?.trim()
                                    ? p.procedureData.parameters
                                    : `Procedure (monitor menu): ${p.name}`,
                                )
                            : undefined
                      }
                      disabled={!isMonitorPowered}
                    />
                  </div>
                ) : null}
              </>
            )}
            {mode === 'twelve_lead' && latestPrintout && (
              <button
                type="button"
                onClick={() => setEnlargedId(latestPrintout.id)}
                className="group relative w-full min-w-0 overflow-hidden rounded-md border border-rose-300/70 bg-[#fffaf0] p-2 text-left shadow-sm transition hover:border-rose-400 hover:shadow-md"
              >
                <div className="mb-1.5 flex items-center justify-between text-[10px] text-zinc-700">
                  <span className="font-semibold tracking-tight">
                    12-lead ECG ·{' '}
                    {latestPrintout.takenAt.toLocaleTimeString()}
                  </span>
                </div>
                <TwelveLeadPaper ac={latestPrintout} large />
              </button>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {mode === 'four_lead' && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                    onClick={takeRhythmStrip}
                  >
                    <Camera className="mr-1.5 size-3.5" />
                    Snapshot
                  </Button>
                  <p className="self-center text-[10px] text-zinc-500">
                    NIBP · EtCO₂ · ECG · 12-Lead on bezel below waveform.
                  </p>
                </>
              )}
              {mode === 'twelve_lead' && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                    onClick={beginTwelveLeadAcquire}
                  >
                    <FileText className="mr-1.5 size-3.5" />
                    Re-acquire
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-zinc-600 text-zinc-200"
                    onClick={() => setMode('four_lead')}
                  >
                    <Activity className="mr-1.5 size-3.5" />
                    Live view
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex min-w-[7rem] flex-col gap-0.5 bg-gradient-to-b from-zinc-950/95 to-black/90 p-1 ring-1 ring-inset ring-white/[0.06]">
            <VitalBlockHr displayHr={merged.hr} />
            <VitalBlockSpo2 displaySpo2={merged.spo2} />
            <VitalBlockEtco2 displayEtco2={merged.etco2} />
            <VitalBlockBp />
            <PulseHeart displayHr={merged.hr} scenario={scenario} />
          </div>
        </div>
      </div>
    </div>

      <p className="text-[11px] text-muted-foreground">
        Stylized monitor — not for diagnosis.
      </p>

      {acquisitions.length > 0 && (
        <SavedTracingsList
          acquisitions={
            mode === 'twelve_lead' && latestPrintout
              ? acquisitions.filter((a) => a.id !== latestPrintout.id)
              : acquisitions
          }
          onEnlarge={setEnlargedId}
        />
      )}

      <Dialog
        open={enlarged !== null}
        onOpenChange={(open) => !open && setEnlargedId(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto sm:max-w-[min(100vw-2rem,56rem)]">
          <DialogHeader>
            <DialogTitle>
              {enlarged?.kind === 'twelve-lead'
                ? '12-lead ECG'
                : 'Rhythm-strip snapshot'}
            </DialogTitle>
            <DialogDescription>
              {enlarged ? (
                <>Acquired {enlarged.takenAt.toLocaleTimeString()}</>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {enlarged?.kind === 'twelve-lead' && (
            <TwelveLeadPaper ac={enlarged} large />
          )}
          {enlarged?.kind === 'rhythm-strip' && (
            <RhythmStripPaper ac={enlarged} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
