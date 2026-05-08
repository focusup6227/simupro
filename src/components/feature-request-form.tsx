"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSupabase, useUser } from "@/supabase";
import { useState } from "react";

const featureRequestSchema = z.object({
  message: z.string().min(15, {
    message: "Please describe your idea in at least 15 characters.",
  }),
});

type FeatureRequestFormValues = z.infer<typeof featureRequestSchema>;

interface FeatureRequestFormProps {
  onSubmitted: () => void;
}

export function FeatureRequestForm({ onSubmitted }: FeatureRequestFormProps) {
  const { toast } = useToast();
  const client = useSupabase();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeatureRequestFormValues>({
    resolver: zodResolver(featureRequestSchema),
    defaultValues: { message: "" },
  });

  async function onSubmit(data: FeatureRequestFormValues) {
    if (!client || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to send a feature request.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const { error } = await client.from("support_tickets").insert({
        id,
        user_id: user.id,
        user_email: user.email ?? "",
        message: data.message.trim(),
        ticket_kind: "feature_request",
        status: "new",
        responses: [],
      });

      if (error) throw error;

      toast({
        title: "Thanks for the idea!",
        description: "We've logged your feature request — the team will review it.",
      });
      form.reset();
      onSubmitted();
    } catch (e: unknown) {
      console.error("feature request submit:", e);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: e instanceof Error ? e.message : "Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What should we build or improve?</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Example: Dark mode toggle in settings; export scenario reports as PDF; mobile-friendly vitals layout…"
                  className="resize-none min-h-[140px]"
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The more detail (who it helps and how you’d use it), the easier it is to prioritize.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Submit feature request"}
        </Button>
      </form>
    </Form>
  );
}
