'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function UserGuide() {
  return (
    <ScrollArea className="max-h-[min(70dvh,520px)] w-full min-h-0 pr-4 sm:pr-6 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="space-y-6 text-sm">
            <div className="space-y-2">
                <h2 className="text-xl font-bold">Getting Started with EMS Simu-Pro</h2>
                <p className="text-muted-foreground">
                  Welcome! This guide walks through the app so you can sharpen clinical decision-making in a safe simulation environment.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">1. The Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>
                      When you sign in, you land on the Dashboard—your home base. From here you can:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                        <li><strong>Track progress:</strong> Completed scenarios, average score, and a UTC calendar-day <strong>training streak</strong>.</li>
                        <li><strong>Start a scenario:</strong> Use <strong>Start New Scenario</strong> to open the library.</li>
                        <li><strong>Review recent runs:</strong> Jump to performance reports for completed sessions.</li>
                        <li><strong>Tutorial:</strong> New users may see a prompt to launch the welcome tutorial scenario.</li>
                        <li><strong>Go deeper:</strong> Open the sidebar for <strong>Performance</strong>, <strong>ECG Trainer</strong> (Premium), <strong>Drug calculator</strong>, <strong>Abbreviations</strong>, and the <strong>Intervention Guide</strong>.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">2. The Scenario Library</CardTitle>
                </CardHeader>
                <CardContent>
                     <p>Choose the case you want to run. Filtering helps you match difficulty and topic to your goals.</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                        <li>
                          <strong>Search and filters:</strong>{' '}
                          Search by title; filter by difficulty, subscription tier (<strong>Free</strong> vs <strong>Premium</strong>), and clinical tags (e.g. Trauma, Pediatric).
                        </li>
                        <li>
                          <strong>Scenario of the day:</strong> One published scenario is highlighted for everyone each UTC day (the tutorial is excluded).
                        </li>
                        <li><strong>Random scenario:</strong> Use the random option if you want a surprise case.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">3. Tools, References, and Practice</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-muted-foreground">
                      Beyond live simulations, use these from the sidebar (some also appear on the landing page):
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li><strong>Drug calculator</strong> — dose helpers; available at <code className="text-xs bg-muted px-1 rounded">/tools/drug-calculator</code>.</li>
                      <li><strong>Abbreviations</strong> — quick reference flashcards.</li>
                      <li><strong>Intervention Guide</strong> — look up interventions and context.</li>
                      <li><strong>ECG Trainer (Premium)</strong> — rhythm identification drills with difficulty and rhythm-family filters. Upgrade under <strong>Billing</strong> if you see a lock screen.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">4. The Simulation Interface</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>On large screens the layout uses two columns; on small screens sections stack. You always have patient context, vitals, and interaction tools.</p>
                    <div>
                        <h4 className="font-semibold">Patient panel</h4>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                            <li><strong>Patient profile:</strong> Age, gender, and relevant history.</li>
                            <li><strong>Current vitals:</strong> Updates based on your actions and the scenario.</li>
                            <li><strong>Monitor / ECG</strong> (when shown): aligns with the clinical picture; logging ECG actions may count toward objectives.</li>
                            <li><strong>Time and role:</strong> Elapsed time and your certification level for grading.</li>
                            <li><strong>Live action log:</strong> A time-stamped list of everything you have ordered or performed.</li>
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold">Simulation log and tabs</h4>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                            <li>
                              <strong>Simulation log:</strong> Dispatch text, patient responses, and environment notes—similar to a running case chat.
                            </li>
                            <li><strong>Tabs:</strong> Assessment, Treatment, Destination, and Comms (radio / SBAR / medical direction). In cardiac arrest workflows, a dedicated arrest workflow may replace these until ROSC or resolution.</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-yellow-500/50 bg-yellow-500/5">
                 <CardHeader>
                    <CardTitle className="text-lg">Special Focus: Cardiac Arrest Workflow</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>When a patient is in cardiac arrest, the interface can switch to a focused resuscitation flow.</p>
                     <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                        <li>
                          <strong>Initiating CPR:</strong>{' '}
                          The arrest-oriented workflow ties to selecting CPR and the scenario state—follow prompts and rhythm checks.
                        </li>
                        <li><strong>Cardiac arrest tab:</strong> Streamlined access to CPR, pads, defibrillation, medications, and related steps as your scope allows.</li>
                        <li>
                          <strong>Cycles:</strong>{' '}
                          The simulation may pause for periodic rhythm reassessment and AED-style analysis where configured.
                        </li>
                        <li><strong>ROSC:</strong> If spontaneous circulation returns, standard assessment and treatment tabs come back for post-arrest care.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">5. Performance Report vs Performance Page</CardTitle>
                </CardHeader>
                <CardContent>
                    <p><strong>After each run,</strong> the report page shows scores, AI coaching, objectives, and your action log for that session.</p>
                    <p className="mt-2">
                      The <strong>Performance</strong> page in the sidebar aggregates trends across <em>many</em> completed simulations—use it to spot patterns over time, separate from a single report.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">6. Account, Roles, and Support</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <h4 className="font-semibold">Admin (administrators only)</h4>
                        <p className="text-muted-foreground">
                          Admin users can manage users, scenarios, billing views, interventions, and support tickets from the Admin section of the sidebar.
                        </p>
                    </div>
                     <div>
                        <h4 className="font-semibold">Settings &amp; support</h4>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                           <li>
                             <strong>Settings:</strong> Profile and picture, simulation certification tier with attested program
                             completion dates (unlock AEMT → Paramedic—not a license verifier), appearance, subscription.
                           </li>
                           <li>
                             <strong>Support &amp; feedback:</strong> Use <strong>Support</strong> or <strong>Feature request</strong> in the sidebar to reach the team.
                           </li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
      </div>
    </ScrollArea>
  );
}
