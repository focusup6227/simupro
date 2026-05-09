"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AiResponseFeedback, Message } from "@/lib/types";
import { stripGradingMarkers } from "@/lib/bp-grading-adjust";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { Separator } from "@/components/ui/separator";

const reviewSchema = z.object({
  reviewStatus: z.enum(["validated", "dismissed"]),
  adminPreferredResponse: z.string().optional(),
  adminReviewNotes: z.string().optional(),
});

export type AiFeedbackReviewFormValues = z.infer<typeof reviewSchema>;

function parseMessages(raw: unknown): Message[] {
  if (!Array.isArray(raw)) return [];
  return raw as Message[];
}

function parseActions(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw;
}

interface AiFeedbackReviewDialogProps {
  feedback: AiResponseFeedback;
  onSubmit: (id: string, values: AiFeedbackReviewFormValues) => Promise<void>;
  onCancel: () => void;
}

export function AiFeedbackReviewDialog({
  feedback,
  onSubmit,
  onCancel,
}: AiFeedbackReviewDialogProps) {
  const messages = parseMessages(feedback.messagesSnapshot);
  const actions = parseActions(feedback.userActionsSnapshot);

  const form = useForm<AiFeedbackReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      reviewStatus:
        feedback.reviewStatus === "pending" ? "validated" : feedback.reviewStatus,
      adminPreferredResponse: feedback.adminPreferredResponse ?? "",
      adminReviewNotes: feedback.adminReviewNotes ?? "",
    },
  });

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">{feedback.scenarioTitle}</span>
          {" · "}
          Sim time ~{feedback.simulationTimeSeconds ?? "—"}s
          {feedback.simulationRole ? ` · Role ${feedback.simulationRole}` : ""}
        </p>
        <p className="mt-1">
          Reported {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
        </p>
      </div>

      <div className="rounded-md border bg-muted/40 p-3">
        <p className="text-xs font-semibold text-muted-foreground">Learner note</p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{feedback.userComment}</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Flagged assistant reply
        </p>
        <div className="rounded-md border bg-amber-500/10 p-3 text-sm">
          <p className="whitespace-pre-wrap">{feedback.flaggedAssistantContent}</p>
        </div>
      </div>

      <Separator />

      <div>
        <p className="mb-2 text-sm font-medium">Full simulation log (messages)</p>
        <ScrollArea className="h-56 rounded-md border p-3">
          <div className="space-y-3 pr-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  i === feedback.assistantMessageIndex
                    ? "rounded-md bg-primary/10 p-2 ring-1 ring-primary/30"
                    : "p-2"
                }
              >
                <p className="text-xs font-medium capitalize text-muted-foreground">
                  {m.role}
                  {i === feedback.assistantMessageIndex ? " · flagged" : ""}
                </p>
                <p className="whitespace-pre-wrap text-sm">
                  {stripGradingMarkers(m.content)}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Action log</p>
        <ScrollArea className="h-32 rounded-md border p-3">
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
            {JSON.stringify(actions, null, 2)}
          </pre>
        </ScrollArea>
      </div>

      <Separator />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (vals) => onSubmit(feedback.id, vals))}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="reviewStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Decision</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="validated">Bad reply — agree (validated)</SelectItem>
                    <SelectItem value="dismissed">Dismiss report</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="adminPreferredResponse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Better reply (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What should the patient AI have said instead?"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="adminReviewNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Internal notes (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Prompt fix, scenario edit, follow-up…"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save review"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
