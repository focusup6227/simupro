
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

const supportFormSchema = z.object({
  message: z.string().min(10, {
    message: "Message must be at least 10 characters.",
  }),
});

type SupportFormValues = z.infer<typeof supportFormSchema>;

interface SupportFormProps {
    onSubmitted: () => void;
}

export function SupportForm({ onSubmitted }: SupportFormProps) {
  const { toast } = useToast();
  const client = useSupabase();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SupportFormValues>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      message: "",
    },
  });

  async function onSubmit(data: SupportFormValues) {
    if (!client || !user) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in to submit a ticket." });
        return;
    }

    setIsSubmitting(true);

    try {
        const id =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const { error } = await client.from('support_tickets').insert({
            id,
            user_id: user.id,
            user_email: user.email ?? '',
            message: data.message,
            ticket_kind: 'support',
            status: 'new',
            responses: [],
        });

        if (error) throw error;

        toast({
            title: "Support Ticket Submitted",
            description: "Thank you! We've received your message and will get back to you shortly.",
        });
        onSubmitted();
    } catch (e: unknown) {
        console.error("Error submitting support ticket:", e);
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: e instanceof Error ? e.message : "An unknown error occurred.",
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
              <FormLabel>Your Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us how we can help..."
                  className="resize-none"
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Please provide as much detail as possible.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Ticket"}
        </Button>
      </form>
    </Form>
  );
}
