'use client';

import { useCallback, useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  partnerAvatarLetter,
  partnerCanPerform,
  partnerScopeBlurb,
} from '@/lib/partner';
import type { Intervention, PartnerSimulationRole } from '@/lib/types';
import { BP_GRADING_MANUAL_MARKER } from '@/lib/bp-grading-adjust';
import { cn } from '@/lib/utils';
import { Loader2, Send, UserRound } from 'lucide-react';

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

export function PartnerPanel(props: {
  partner: { name: string; role: PartnerSimulationRole };
  interventions: Intervention[];
  adviceHistory: PartnerAdviceItem[];
  onDelegate: (spec: DelegateSpec) => Promise<void>;
  onAskPartner: (question: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  const {
    partner,
    interventions,
    adviceHistory,
    onDelegate,
    onAskPartner,
    disabled,
    className,
  } = props;
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [delegatingKey, setDelegatingKey] = useState<string | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, Intervention>();
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

  const roleLabel =
    partner.role === 'paramedic'
      ? 'Paramedic'
      : partner.role === 'aemt'
        ? 'AEMT'
        : 'EMT';

  const delegates = useMemo((): (DelegateSpec & { key: string })[] => {
    const rows: (DelegateSpec & { key: string })[] = [
      {
        key: 'manual-bp',
        label: 'Take manual BP',
        chatter: `Copy — I’ve got the cuff, auscultating now.`,
        assessmentDetail: `Partner obtains manual blood pressure (auscultation). ${BP_GRADING_MANUAL_MARKER}`,
      },
      {
        key: 'cpr',
        label: 'Start CPR / switch compressors',
        chatter: `On the chest — high-quality compressions, I’ll rotate as needed.`,
        assessmentDetail: `Partner performs high-quality CPR and coordinates compressor changes.`,
        treatmentIds: ['cpr'],
      },
      {
        key: 'bvm',
        label: 'BVM 1 breath / 6 s',
        chatter: `Bagging — ten breaths per minute with good seal.`,
        assessmentDetail: `Partner provides BVM ventilations (~1 breath every 6s) with BLS airway adjuncts as indicated.`,
      },
      {
        key: 'aed',
        label: 'Hook up AED / pads',
        chatter: `Pads on — prep for rhythm check.`,
        assessmentDetail: `Partner applies monitor/defibrillator pads and prepares for analysis.`,
        treatmentIds: ['apply-monitor-pads'],
      },
      {
        key: 'pulse',
        label: 'Recheck pulse / rhythm',
        chatter: `Holding compressions briefly — checking pulse and rhythm.`,
        assessmentDetail: `Partner pauses briefly to assess pulse and rhythm per protocol.`,
        treatmentIds: ['pulse-rhythm-check'],
      },
    ];

    if (partner.role === 'aemt' || partner.role === 'paramedic') {
      rows.push({
        key: 'iv',
        label: 'Start IV/IO + lock',
        chatter: `Securing IV/IO access and saline lock now.`,
        assessmentDetail: `Partner establishes vascular access and secures saline lock per protocol.`,
        treatmentIds: ['iv-access'],
      });
    }

    if (partner.role === 'paramedic') {
      rows.push(
        {
          key: 'epi',
          label: 'Push next epi (cardiac)',
          chatter: `Drawing and pushing cardiac epi per protocol — watch rhythm/PulseOx.`,
          assessmentDetail: `Partner administers IV/IO epinephrine for cardiac arrest per protocol.`,
          treatmentIds: ['epinephrine-cardiac'],
        },
        {
          key: 'amio',
          label: 'Amiodarone / drip setup',
          chatter: `Mixing amiodarone and getting infusion set up per protocol.`,
          assessmentDetail: `Partner prepares and administers amiodarone / drip per ACLS protocol.`,
          treatmentIds: ['amiodarone'],
        },
      );
    }

    return rows.filter((row) => {
      if (!row.treatmentIds?.length) return true;
      return row.treatmentIds.every((id) => can(id));
    });
  }, [partner.role, can]);

  async function runDelegate(spec: DelegateSpec & { key: string }) {
    setDelegatingKey(spec.key);
    try {
      await onDelegate(spec);
    } finally {
      setDelegatingKey(null);
    }
  }

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
            <span className="text-muted-foreground"> — {roleLabel}</span>
          </span>
        </CardDescription>
        <p className="text-xs text-muted-foreground">{partnerScopeBlurb(partner.role)}</p>
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

        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Delegate (counts in log)</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {delegates.map((d) => (
              <Button
                key={d.key}
                type="button"
                variant="secondary"
                size="sm"
                className="h-auto min-h-9 whitespace-normal py-1.5 text-left text-xs"
                disabled={disabled || delegatingKey !== null}
                onClick={() => void runDelegate(d)}
              >
                {delegatingKey === d.key ? (
                  <Loader2 className="mr-1 h-3 w-3 shrink-0 animate-spin inline" />
                ) : null}
                {d.label}
              </Button>
            ))}
          </div>
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
