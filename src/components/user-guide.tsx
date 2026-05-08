
'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function UserGuide() {
  return (
    <ScrollArea className="h-[70vh] pr-6">
        <div className="space-y-6 text-sm">
            <div className="space-y-2">
                <h2 className="text-xl font-bold">Getting Started with EMS Simu-Pro</h2>
                <p className="text-muted-foreground">
                  {
                    "Welcome! This guide will walk you through the application's features to help you sharpen your clinical decision-making skills."
                  }
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">1. The Dashboard: Your Home Base</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>
                      {
                        "When you first launch the app, you'll land on the Dashboard. Think of this as your central hub. From here, you can:"
                      }
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                        <li><strong>Track Your Progress:</strong> See at-a-glance statistics like your completed scenarios and average score.</li>
                        <li>
                          <strong>Jump into Action:</strong>{' '}
                          {
                            'Click the "Start a Scenario" button to go to the scenario library.'
                          }
                        </li>
                        <li><strong>Review Past Performance:</strong> Find a list of your recent simulations with links to their performance reports.</li>
                        <li><strong>Learn the Ropes:</strong> New users will find a prompt for a guided tutorial scenario.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">2. The Scenario Library: Choose Your Challenge</CardTitle>
                </CardHeader>
                <CardContent>
                     <p>The library is where you select the case you want to tackle. We’ve made it easy to find the perfect scenario for your training needs.</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                        <li>
                          <strong>Filter and Search:</strong>{' '}
                          {
                            'Search by title or use filters for difficulty, subscription tier (Free/Pro), and clinical tags (e.g., "Trauma," "Pediatric").'
                          }
                        </li>
                        <li><strong>Start a Random Scenario:</strong> Feeling adventurous? Use this button to be assigned a random case.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">3. The Simulation Interface</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>The simulation screen is divided into two columns to give you all the information and tools you need.</p>
                    <div>
                        <h4 className="font-semibold">On the Left: At-a-Glance Info</h4>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                            <li><strong>Patient Profile:</strong> Age, gender, and relevant medical history.</li>
                            <li><strong>Current Vitals:</strong> A live feed of vital signs that updates based on your actions.</li>
                            <li><strong>Performance:</strong> Track time elapsed and your current role.</li>
                            <li><strong>Live Action Log:</strong> A time-stamped list of every action you perform.</li>
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold">On the Right: Interaction & Logs</h4>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                            <li>
                              <strong>Simulation Log:</strong>{' '}
                              {
                                'The main "chat" window with dispatch info, patient responses, and reactions.'
                              }
                            </li>
                            <li><strong>Action Tabs:</strong> Your primary tools for patient care:
                                <ul className="list-circle pl-5 mt-1">
                                    <li><strong>Assessment:</strong> Ask questions, perform exams, check vitals.</li>
                                    <li><strong>Treatment:</strong> Administer drugs and perform procedures.</li>
                                    <li><strong>Destination:</strong> Choose a hospital and transport priority.</li>
                                    <li><strong>Comms:</strong> Generate an SBAR report or request medical direction.</li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-yellow-500/50 bg-yellow-500/5">
                 <CardHeader>
                    <CardTitle className="text-lg">Special Focus: The Cardiac Arrest Workflow</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>When a patient is in cardiac arrest, the interface adapts to help you focus on critical, life-saving tasks.</p>
                     <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                        <li>
                          <strong>Initiating CPR:</strong>{' '}
                          {
                            'The specialized workflow begins only after you select "Cardiopulmonary Resuscitation (CPR)" from the Treatment tab.'
                          }
                        </li>
                        <li><strong>The Cardiac Arrest Tab:</strong> This streamlined tab replaces the others and contains only the essentials for resuscitation (CPR, Pads, Defibrillation, Meds, etc.).</li>
                        <li>
                          <strong>Automated Analysis:</strong>{' '}
                          {
                            'Every two minutes, the simulation will pause for an AED analysis and announce "Shock Advised" or "No Shock Advised."'
                          }
                        </li>
                        <li><strong>ROSC:</strong> If your interventions are successful and the patient achieves Return of Spontaneous Circulation (ROSC), the standard tabs will return for post-arrest care.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">4. The Performance Report: Review and Improve</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>After ending a simulation, you are taken to your personalized report page. This is where the real learning happens.</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                        <li><strong>Scores:</strong> See your scores for both Assessment and Treatment.</li>
                        <li><strong>AI Feedback:</strong> Read a detailed, personalized analysis from the AI educator on what you did well, what you missed, and how to improve.</li>
                        <li><strong>Action Log:</strong> Review a final, time-stamped log of every action you took.</li>
                        <li><strong>Objectives Checklist:</strong> See a summary of the mandatory actions, suggested actions, and critical failures for that scenario.</li>
                    </ul>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">5. Advanced Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <h4 className="font-semibold">Admin Panel (For Administrators Only)</h4>
                        <p className="text-muted-foreground">
                          {
                            "Users with the 'admin' role can access a special panel to manage user roles, scenarios, and support tickets."
                          }
                        </p>
                    </div>
                     <div>
                        <h4 className="font-semibold">Settings & Support</h4>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                           <li><strong>Settings:</strong> Change your display name, profile picture, default simulation role, and application theme (light/dark).</li>
                           <li>
                             <strong>Support:</strong>{' '}
                             {
                               'Use the "Support" button in the sidebar to open a dialog and submit a ticket.'
                             }
                           </li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
      </div>
    </ScrollArea>
  );
}
