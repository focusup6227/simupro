'use client';

import { useCallback } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { partnerAvatarLetter, partnerScopeBlurb } from '@/lib/partner';
import type { PartnerSimulationRole } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Loader2, Mic, MicOff, Send, UserRound } from 'lucide-react';

export type PartnerAdviceItem = {
  id: string;
  text: string;
  urgency: 'low' | 'medium' | 'high';
  atSim: number;
};

const ROLE_LABEL: Record<PartnerSimulationRole, string> = {
  emt: 'EMT',
  aemt: 'AEMT',
  paramedic: 'Paramedic',
};

/**
 * Free-form partner panel. The learner types (or dictates) a single
 * instruction — "Drew, get a 12-lead and start an IV" — and an AI flow
 * decides what to do with it. We deliberately *don't* expose the legacy
 * structured Quick / category buttons; many of them silently no-op'd, and
 * it's cleaner to have the model resolve scope from a free-form line.
 */
export function PartnerPanel(props: {
  partner: { name: string; role: PartnerSimulationRole };
  adviceHistory: PartnerAdviceItem[];
  /** Controlled instruction text (lifted up so dictation can append into it). */
  instruction: string;
  onInstructionChange: (next: string) => void;
  onSend: (instruction: string) => Promise<void> | void;
  /** Mic button — undefined hides it (when SpeechRecognition is unsupported). */
  onToggleMic?: () => void;
  micActive?: boolean;
  /** Disabled while a previous instruction or AI turn is in flight. */
  busy?: boolean;
  disabled?: boolean;
  isPediatric?: boolean;
  className?: string;
}) {
  const {
    partner,
    adviceHistory,
    instruction,
    onInstructionChange,
    onSend,
    onToggleMic,
    micActive,
    busy,
    disabled,
    isPediatric = false,
    className,
  } = props;

  const send = useCallback(async () => {
    const text = instruction.trim();
    if (!text) return;
    await onSend(text);
  }, [instruction, onSend]);

  const urgencyClass = (u: PartnerAdviceItem['urgency']) =>
    u === 'high'
      ? 'border-destructive/60 text-destructive'
      : u === 'medium'
        ? 'border-amber-600/50 text-amber-800 dark:text-amber-200'
        : 'border-muted text-muted-foreground';

  const isBusy = Boolean(busy);
  const isDisabled = Boolean(disabled);

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
          <ScrollArea className="h-[6rem] rounded-md border bg-muted/30 pr-2">
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
          <div className="flex items-center justify-between">
            <Label
              htmlFor="partner-instruction"
              className="text-xs font-medium text-muted-foreground"
            >
              Tell {partner.name} to…
            </Label>
            {onToggleMic ? (
              <Button
                type="button"
                variant={micActive ? 'destructive' : 'outline'}
                size="sm"
                onClick={onToggleMic}
                disabled={isDisabled}
              >
                {micActive ? (
                  <MicOff className="mr-2 h-4 w-4" />
                ) : (
                  <Mic className="mr-2 h-4 w-4" />
                )}
                {micActive ? 'Stop Mic' : 'Speak'}
              </Button>
            ) : null}
          </div>
          <Textarea
            id="partner-instruction"
            placeholder={`e.g. "Get a 12-lead and start a line", "Take a manual BP", "Ask about allergies"`}
            className="min-h-[4.5rem] text-sm"
            value={instruction}
            disabled={isDisabled || isBusy}
            onChange={(e) => onInstructionChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={isDisabled || isBusy || !instruction.trim()}
            onClick={() => void send()}
          >
            {isBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isBusy ? 'Working…' : 'Send'}
          </Button>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Plain English. {partner.name} will do anything in their scope and
            push back on what&rsquo;s above their level.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
