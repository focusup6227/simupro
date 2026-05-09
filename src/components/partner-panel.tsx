'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  partnerAvatarLetter,
  partnerCanPerform,
  partnerMeetsMinRole,
  partnerScopeBlurb,
} from '@/lib/partner';
import {
  CATEGORY_META,
  DELEGATE_CATALOG,
  pickChatter,
  type DelegateCategory,
  type DelegateEntry,
} from '@/lib/partner-delegate-catalog';
import type {
  LegacySupabaseIntervention,
  PartnerSimulationRole,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { History, Loader2, Send, UserRound } from 'lucide-react';

export type PartnerAdviceItem = {
  id: string;
  text: string;
  urgency: 'low' | 'medium' | 'high';
  atSim: number;
};

type DelegateSpec = {
  label: string;
  chatter: string;
  assessmentDetail: string;
  treatmentIds?: string[];
};

const ROLE_LABEL: Record<PartnerSimulationRole, string> = {
  emt: 'EMT',
  aemt: 'AEMT',
  paramedic: 'Paramedic',
};

const MRU_STORAGE_KEY = 'simupro:partner-delegate-mru-v1';
const MRU_LIMIT = 4;
/** Hard cap for the visible Quick row so MRU + defaults stay tidy. */
const QUICK_VISIBLE_CAP = 6;

function readMru(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MRU_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MRU_LIMIT);
  } catch {
    return [];
  }
}

function writeMru(keys: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      MRU_STORAGE_KEY,
      JSON.stringify(keys.slice(0, MRU_LIMIT)),
    );
  } catch {
    /* localStorage unavailable — ignore */
  }
}

export function PartnerPanel(props: {
  partner: { name: string; role: PartnerSimulationRole };
  interventions: LegacySupabaseIntervention[];
  adviceHistory: PartnerAdviceItem[];
  onDelegate: (spec: DelegateSpec) => Promise<void>;
  onAskPartner: (question: string) => Promise<void>;
  /** Drives pediatric chatter / dose overrides on supported delegates. */
  isPediatric?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const {
    partner,
    interventions,
    adviceHistory,
    onDelegate,
    onAskPartner,
    isPediatric = false,
    disabled,
    className,
  } = props;
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [delegatingKey, setDelegatingKey] = useState<string | null>(null);
  const [mruKeys, setMruKeys] = useState<string[]>([]);

  // Hydrate MRU from localStorage on mount (avoids SSR mismatch).
  useEffect(() => {
    setMruKeys(readMru());
  }, []);

  // Per-key chatter rotation counter; random offset so two sessions don't sync.
  const chatterIndexRef = useRef<Record<string, number>>({});
  const initialOffsetRef = useRef<number>(
    typeof window === 'undefined' ? 0 : Math.floor(Math.random() * 1000),
  );

  const byId = useMemo(() => {
    const m = new Map<string, LegacySupabaseIntervention>();
    for (const i of interventions) m.set(i.id, i);
    return m;
  }, [interventions]);

  const can = useCallback(
    (id: string) => {
      const iv = byId.get(id);
      return iv ? partnerCanPerform(iv, partner.role) : false;
    },
    [byId, partner.role],
  );

  const visibleEntries = useMemo(() => {
    return DELEGATE_CATALOG.filter((row) => {
      if (!partnerMeetsMinRole(partner.role, row.minRole)) return false;
      if (row.treatmentIds && row.treatmentIds.length > 0) {
        return row.treatmentIds.every((id) => can(id));
      }
      return true;
    });
  }, [partner.role, can]);

  const visibleByKey = useMemo(() => {
    const m = new Map<string, DelegateEntry>();
    for (const e of visibleEntries) m.set(e.key, e);
    return m;
  }, [visibleEntries]);

  const baseQuickEntries = useMemo(
    () => visibleEntries.filter((e) => e.category === 'quick'),
    [visibleEntries],
  );

  /** Quick = MRU (visible) prepended to default Quick, deduped, capped. */
  const quickEntries = useMemo(() => {
    const seen = new Set<string>();
    const out: DelegateEntry[] = [];
    for (const k of mruKeys) {
      const e = visibleByKey.get(k);
      if (e && !seen.has(e.key)) {
        seen.add(e.key);
        out.push(e);
        if (out.length >= QUICK_VISIBLE_CAP) return out;
      }
    }
    for (const e of baseQuickEntries) {
      if (seen.has(e.key)) continue;
      seen.add(e.key);
      out.push(e);
      if (out.length >= QUICK_VISIBLE_CAP) break;
    }
    return out;
  }, [mruKeys, visibleByKey, baseQuickEntries]);

  const grouped = useMemo(() => {
    const groups: Record<Exclude<DelegateCategory, 'quick'>, DelegateEntry[]> = {
      circulation: [],
      airway: [],
      meds: [],
      logistics: [],
    };
    for (const e of visibleEntries) {
      if (e.category === 'quick') continue;
      groups[e.category].push(e);
    }
    return groups;
  }, [visibleEntries]);

  const buildSpec = useCallback(
    (entry: DelegateEntry): DelegateSpec => {
      const baseIdx =
        chatterIndexRef.current[entry.key] ??
        initialOffsetRef.current;
      const chatterSrc =
        isPediatric && entry.peds?.chatter ? entry.peds.chatter : entry.chatter;
      const chatter = pickChatter(chatterSrc, baseIdx);
      chatterIndexRef.current[entry.key] = baseIdx + 1;
      const assessmentDetail =
        isPediatric && entry.peds?.assessmentDetail
          ? entry.peds.assessmentDetail
          : entry.assessmentDetail;
      return {
        label: entry.label,
        chatter,
        assessmentDetail,
        treatmentIds: entry.treatmentIds,
      };
    },
    [isPediatric],
  );

  const runDelegate = useCallback(
    async (entry: DelegateEntry) => {
      setDelegatingKey(entry.key);
      try {
        await onDelegate(buildSpec(entry));
        setMruKeys((prev) => {
          const next = [entry.key, ...prev.filter((k) => k !== entry.key)].slice(
            0,
            MRU_LIMIT,
          );
          writeMru(next);
          return next;
        });
      } finally {
        setDelegatingKey(null);
      }
    },
    [onDelegate, buildSpec],
  );

  async function sendAsk() {
    const q = question.trim();
    if (!q) return;
    setAsking(true);
    try {
      await onAskPartner(q);
      setQuestion('');
    } finally {
      setAsking(false);
    }
  }

  const urgencyClass = (u: PartnerAdviceItem['urgency']) =>
    u === 'high'
      ? 'border-destructive/60 text-destructive'
      : u === 'medium'
        ? 'border-amber-600/50 text-amber-800 dark:text-amber-200'
        : 'border-muted text-muted-foreground';

  const renderButton = (d: DelegateEntry) => {
    const isMru = mruKeys.includes(d.key);
    return (
      <Button
        key={d.key}
        type="button"
        variant="secondary"
        size="sm"
        className={cn(
          'h-auto min-h-9 whitespace-normal py-1.5 text-left text-xs',
          isMru && 'ring-1 ring-emerald-600/40',
        )}
        disabled={disabled || delegatingKey !== null}
        onClick={() => void runDelegate(d)}
        title={
          isMru
            ? 'Recently used — quick access'
            : d.peds && isPediatric
              ? 'Pediatric dosing'
              : undefined
        }
      >
        {delegatingKey === d.key ? (
          <Loader2 className="mr-1 h-3 w-3 shrink-0 animate-spin inline" />
        ) : isMru ? (
          <History className="mr-1 h-3 w-3 shrink-0 inline text-emerald-700" />
        ) : null}
        {d.label}
      </Button>
    );
  };

  const orderedCategories: Exclude<DelegateCategory, 'quick'>[] = [
    'circulation',
    'airway',
    'meds',
    'logistics',
  ];
  const populatedCategories = orderedCategories.filter(
    (c) => grouped[c].length > 0,
  );
  const defaultOpenCategories = populatedCategories.slice(
    0,
    Math.min(2, populatedCategories.length),
  );

  return (
    <Card className={cn('shrink-0', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="h-4 w-4" />
          AI partner
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-emerald-700 text-emerald-50 text-xs font-semibold">
              {partnerAvatarLetter(partner.role)}
            </AvatarFallback>
          </Avatar>
          <span>
            <span className="font-semibold text-foreground">{partner.name}</span>
            <span className="text-muted-foreground"> — {ROLE_LABEL[partner.role]}</span>
          </span>
        </CardDescription>
        <p className="text-xs text-muted-foreground">
          {partnerScopeBlurb(partner.role)}
          {isPediatric ? (
            <span className="ml-1 rounded bg-emerald-700/15 px-1 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
              Peds dosing
            </span>
          ) : null}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Recent advice</p>
          <ScrollArea className="h-[7rem] rounded-md border bg-muted/30 pr-2">
            <ul className="space-y-2 p-2">
              {adviceHistory.length === 0 && (
                <li className="text-xs text-muted-foreground">No tips yet.</li>
              )}
              {[...adviceHistory].reverse().map((a) => (
                <li key={a.id}>
                  <Badge variant="outline" className={cn('mb-1 font-normal', urgencyClass(a.urgency))}>
                    {a.urgency}
                  </Badge>
                  <p className="text-xs leading-snug">{a.text}</p>
                  <p className="text-[10px] text-muted-foreground">t+{a.atSim}s</p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Delegate (counts in log)
          </p>
          {quickEntries.length > 0 ? (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {quickEntries.map(renderButton)}
            </div>
          ) : null}

          {populatedCategories.length > 0 ? (
            <ScrollArea className="max-h-[18rem] rounded-md border bg-muted/20 pr-1">
              <Accordion
                type="multiple"
                defaultValue={defaultOpenCategories}
                className="px-2"
              >
                {populatedCategories.map((cat) => (
                  <AccordionItem
                    key={cat}
                    value={cat}
                    className="border-b last:border-b-0"
                  >
                    <AccordionTrigger className="py-2 text-xs font-medium">
                      <span className="flex w-full items-center justify-between gap-2 pr-1">
                        <span>{CATEGORY_META[cat].label}</span>
                        <span className="rounded bg-background px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                          {grouped[cat].length}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-2 pt-0">
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {grouped[cat].map(renderButton)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Ask your partner</p>
          <Textarea
            placeholder="e.g. Should we shock this rhythm?"
            className="min-h-[4rem] text-sm"
            value={question}
            disabled={disabled || asking}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={disabled || asking || !question.trim()}
            onClick={() => void sendAsk()}
          >
            {asking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
