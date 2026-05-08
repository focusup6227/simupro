
"use client";

import { useForm, Controller } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type {
  SupportTicket,
  SupportTicketKind,
  SupportTicketResponse,
} from "@/lib/types";
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

function ticketKindLabel(kind: SupportTicketKind): string {
  switch (kind) {
    case "feature_request":
      return "Feature request";
    case "issue":
      return "Simulation issue";
    default:
      return "Support";
  }
}

function formatTimestamp(timestamp: unknown) {
    if (!timestamp) return 'N/A';
    // `createdAt` may come from Supabase (string/Date) or a legacy shape with `toDate()`.
    const t = timestamp as any;
    const date = t?.toDate ? t.toDate() : new Date(t);
    return formatDistanceToNow(date, { addSuffix: true });
}


const ticketDialogSchema = z.object({
  response: z.string().optional(),
  status: z.enum(['new', 'in-progress', 'resolved']),
});

type TicketDialogFormValues = z.infer<typeof ticketDialogSchema>;

interface SupportTicketDialogProps {
    ticket: SupportTicket;
    onSubmit: (ticketId: string, values: TicketDialogFormValues) => void;
    onCancel: () => void;
}

export function SupportTicketDialog({ ticket, onSubmit, onCancel }: SupportTicketDialogProps) {
  const form = useForm<TicketDialogFormValues>({
    resolver: zodResolver(ticketDialogSchema),
    defaultValues: {
      response: "",
      status: ticket.status || 'new',
    },
  });

  const handleSubmit = (values: TicketDialogFormValues) => {
    onSubmit(ticket.id, values);
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{ticketKindLabel(ticket.ticketKind)}</Badge>
        </div>

        {ticket.scenarioId && ticket.scenarioTitle && (
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-base">Related Scenario</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="font-semibold">{ticket.scenarioTitle}</p>
                </CardContent>
            </Card>
        )}
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Original Message</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.message}</p>
                <p className="text-xs text-muted-foreground mt-2">{formatTimestamp(ticket.createdAt)}</p>
            </CardContent>
        </Card>

        {ticket.responses && ticket.responses.length > 0 && (
            <div>
                 <h3 className="text-lg font-semibold mb-2">Response History</h3>
                <ScrollArea className="h-40 w-full rounded-md border p-4">
                    <div className="space-y-4">
                        {ticket.responses.map((res, index) => (
                             <div key={index} className="text-sm">
                                <p className="whitespace-pre-wrap">{res.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    - {res.responder} ({formatTimestamp(res.createdAt)})
                                </p>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        )}

        <Separator />

        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
            control={form.control}
            name="response"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Add Response</FormLabel>
                <FormControl>
                    <Textarea
                    placeholder="Type your response here..."
                    {...field}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Update Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
            />

            <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
            </Button>
            <Button type="submit">
                Submit Response & Update
            </Button>
            </div>
        </form>
        </Form>
    </div>
  );
}
