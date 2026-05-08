"use client"

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useCollection, useSupabase, useMemoSupabase, useDoc, useUser, useDashboardProfile } from '@/supabase';
import type { Scenario, ScenarioReview } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Circle, MessageSquare, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDistanceToNow } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { updateDocumentNonBlocking } from '@/supabase/non-blocking-updates';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';
import { toDate } from '@/lib/date-utils';

const rolesToTest = ['emt', 'aemt', 'paramedic'] as const;

const reviewFormSchema = z.object({
    comments: z.string().optional(),
    approved: z.enum(['true', 'false'], { required_error: 'You must select approve or reject.' }),
    testedAsRole: z.enum(rolesToTest, { required_error: 'You must select a role.'}),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

function formatTimestamp(timestamp: unknown) {
    const d = toDate(timestamp);
    if (!d) return 'N/A';
    return formatDistanceToNow(d, { addSuffix: true });
}

export default function ScenarioReviewPage() {
    const params = useParams();
    const scenarioId = (params?.id as string) || '';
    const client = useSupabase();
    const { user: authUser } = useUser();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

    const { data: userData } = useDashboardProfile();

    const scenarioSpec = useMemoSupabase(
        () =>
            client && scenarioId
              ? ({ table: 'scenarios' as const, id: scenarioId, live: false } as const)
              : null,
        [client, scenarioId]
    );
    const { data: scenario, isLoading: isLoadingScenario } = useDoc<Scenario>(scenarioSpec);

    const reviewsSpec = useMemoSupabase(
        () => (client && scenarioId)
          ? { table: 'scenario_reviews' as const, eq: { scenario_id: scenarioId } }
          : null,
        [client, scenarioId]
    );
    const { data: reviews, isLoading: isLoadingReviews } = useCollection<ScenarioReview>(reviewsSpec);

    const form = useForm<ReviewFormValues>({
        resolver: zodResolver(reviewFormSchema),
        defaultValues: {
            testedAsRole: userData?.testRole || 'emt',
        }
    });

    const testRole = userData?.testRole || 'emt';
    const { reset } = form;
    useEffect(() => {
        reset({
            testedAsRole: testRole,
            approved: undefined,
            comments: '',
        });
    }, [testRole, reset]);


    const onSubmitReview = async (values: ReviewFormValues) => {
        if (!client || !authUser || !userData || !scenario) return;

        setIsSubmitting(true);
        try {
            const rid =
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

            const { error } = await client.from('scenario_reviews').insert({
                id: rid,
                scenario_id: scenario.id,
                tester_id: authUser.id,
                tester_name: userData.displayName ?? 'Tester',
                tested_as_role: values.testedAsRole,
                approved: values.approved === 'true',
                comments: values.comments || null,
            });
            if (error) throw error;

            toast({ title: 'Review Submitted', description: 'Thank you for your feedback.' });
            setReviewDialogOpen(false);
            form.reset();
        } catch (error: unknown) {
            toast({
              variant: 'destructive',
              title: 'Error',
              description: error instanceof Error ? error.message : 'Failed',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePublish = () => {
        if (!client || !scenario) return;
        updateDocumentNonBlocking(client, 'scenarios', scenario.id, { status: 'published' });
        toast({
            title: "Scenario Published!",
            description: `"${scenario?.title}" is now available to all users.`,
        });
    }

    const approvalStatus = useMemo(() => {
        const status: Record<string, { count: number; names: string[] }> = {
            emt: { count: 0, names: [] },
            aemt: { count: 0, names: [] },
            paramedic: { count: 0, names: [] },
        };
        if (!reviews) return status;

        reviews.forEach(review => {
            if (review.approved) {
                status[review.testedAsRole].count++;
                status[review.testedAsRole].names.push(review.testerName);
            }
        });
        return status;
    }, [reviews]);

    const canPublish = rolesToTest.every(role => approvalStatus[role].count >= 2);
    const userRole = userData?.role;


    if (isLoadingScenario || isLoadingReviews) {
        return <div><Skeleton className="h-96 w-full" /></div>;
    }

    if (!scenario) {
        return <div className="text-center py-12">Scenario not found.</div>;
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{scenario.title}</h1>
                <p className="text-muted-foreground">Review status and comments for this scenario.</p>
                <Badge variant={scenario.status === 'published' ? 'default' : 'secondary'} className="mt-2 capitalize">{scenario.status}</Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Approval Progress</CardTitle>
                    <CardDescription>Two approvals are needed for each role before publishing.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                        {rolesToTest.map(role => (
                            <div key={role} className="p-4 bg-muted/50 rounded-lg">
                                <p className="text-sm uppercase font-semibold text-muted-foreground">{role}</p>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    {[...Array(2)].map((_, i) => (
                                        i < approvalStatus[role].count
                                            ? <CheckCircle key={i} className="h-6 w-6 text-green-500" />
                                            : <Circle key={i} className="h-6 w-6 text-muted-foreground/20" />
                                    ))}
                                </div>
                                 <p className="text-xs text-muted-foreground mt-2 h-8">
                                    {approvalStatus[role].names.join(', ')}
                                 </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end gap-2">
                    {userRole === 'admin' && (
                        <Button onClick={() => void handlePublish()} disabled={!canPublish}>
                            <Check className="mr-2"/> Publish Scenario
                        </Button>
                    )}
                </CardFooter>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Tester Reviews</CardTitle>
                        <CardDescription>Feedback submitted by the testing team.</CardDescription>
                    </div>
                     <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                        <DialogTrigger asChild>
                            <Button> <MessageSquare className="mr-2"/> Add Your Review</Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>Submit Your Review</DialogTitle>
                                <DialogDescription>Your feedback will be visible to the admin team.</DialogDescription>
                            </DialogHeader>
                             <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmitReview)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="testedAsRole"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Reviewing For Role</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a role" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="emt">EMT</SelectItem>
                                                        <SelectItem value="aemt">AEMT</SelectItem>
                                                        <SelectItem value="paramedic">Paramedic</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                     <FormField
                                        control={form.control}
                                        name="approved"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel>Do you approve this scenario for the selected role?</FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    className="flex items-center space-x-4"
                                                    >
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value="true" id="approve"/>
                                                        </FormControl>
                                                        <FormLabel htmlFor="approve" className="font-normal flex items-center gap-2"><ThumbsUp className="text-green-500"/> Approve</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                        <RadioGroupItem value="false" id="reject"/>
                                                        </FormControl>
                                                        <FormLabel htmlFor="reject" className="font-normal flex items-center gap-2"><ThumbsDown className="text-red-500"/> Reject</FormLabel>
                                                    </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="comments"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Comments (Optional)</FormLabel>
                                            <FormControl>
                                            <Textarea
                                                placeholder="Provide feedback on accuracy, difficulty, or suggest improvements..."
                                                {...field}
                                            />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? 'Submitting...' : 'Submit Review'}
                                    </Button>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                    {reviews?.length === 0 && <p className="text-muted-foreground text-center py-8">No reviews yet.</p>}
                    {reviews?.map(review => (
                        <div key={review.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold">{review.testerName}</p>
                                    <Badge variant="secondary" className="uppercase">{review.testedAsRole}</Badge>
                                </div>
                                <Badge variant={review.approved ? 'default' : 'destructive'}>
                                    {review.approved ? <><ThumbsUp className="mr-2"/> Approved</> : <><ThumbsDown className="mr-2"/> Rejected</>}
                                </Badge>
                            </div>
                            {review.comments && <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">{review.comments}</p>}
                            <p className="text-xs text-muted-foreground/70 mt-2 text-right">{formatTimestamp(review.createdAt)}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
