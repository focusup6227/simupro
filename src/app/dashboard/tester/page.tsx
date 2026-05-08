
"use client";

import { useMemo } from 'react';
import { useCollection, useSupabase, useMemoSupabase } from '@/supabase';
import type { Scenario, ScenarioReview } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, FileText, FlaskConical, Play, Star } from 'lucide-react';
import Link from 'next/link';

const rolesToTest: ('emt' | 'aemt' | 'paramedic')[] = ['emt', 'aemt', 'paramedic'];

function ScenarioTestCard({ scenario }: { scenario: Scenario }) {
    const client = useSupabase();

    const reviewsSpec = useMemoSupabase(
        () => client ? { table: 'scenario_reviews' as const, eq: { scenario_id: scenario.id } } : null,
        [client, scenario.id]
    );
    const { data: reviews } = useCollection<ScenarioReview>(reviewsSpec);

    const getApprovalStatus = (role: 'emt' | 'aemt' | 'paramedic') => {
        const approvals = reviews?.filter(r => r.testedAsRole === role && r.approved) || [];
        return approvals.length;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {scenario.title}
                  {scenario.isPremium && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" aria-label="Premium scenario" />
                  )}
                </CardTitle>
                <CardDescription>{scenario.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <p className="text-sm font-medium">Approval Status:</p>
                    <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3 sm:gap-4">
                        {rolesToTest.map(role => {
                            const approvalCount = getApprovalStatus(role);
                            return (
                                <div key={role}>
                                    <p className="text-xs uppercase text-muted-foreground">{role}</p>
                                    <div className="flex items-center justify-center gap-1 mt-1">
                                        {[...Array(2)].map((_, i) => (
                                            i < approvalCount
                                                ? <CheckCircle key={i} className="h-5 w-5 text-green-500" />
                                                : <Circle key={i} className="h-5 w-5 text-muted-foreground/30" />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
            <CardContent>
                 <div className="flex justify-end gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/dashboard/tester/scenarios/${scenario.id}`}>
                            <FileText className="mr-2"/> View Reviews
                        </Link>
                    </Button>
                    <Button asChild>
                         <Link href={`/dashboard/scenarios/${scenario.id}`}>
                            <Play className="mr-2"/> Test Scenario
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function TesterDashboard() {
    const client = useSupabase();

    const draftScenariosSpec = useMemoSupabase(
        () =>
            client
              ? ({
                  table: 'scenarios' as const,
                  neq: { status: 'published' },
                  live: false,
                } as const)
              : null,
        [client]
    );

    const { data: scenarios, isLoading } = useCollection<Scenario>(draftScenariosSpec);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <FlaskConical /> Tester Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Review and approve new scenarios before they are published.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && <p>Loading scenarios...</p>}
                {!isLoading && scenarios?.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        <p>No scenarios are currently awaiting review.</p>
                    </div>
                )}
                {scenarios?.map(scenario => (
                    <ScenarioTestCard key={scenario.id} scenario={scenario} />
                ))}
            </div>
        </div>
    );
}
