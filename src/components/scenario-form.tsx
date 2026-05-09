
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { Scenario } from '@/lib/types';
import { ScenarioSchema } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { COMORBIDITY_MATRIX } from '@/lib/physiology/comorbidity-matrix';
import { hospitals } from '@/lib/hospitals-data';
import {
  ALL_ECG_RHYTHM_KINDS,
  RHYTHM_FAMILY,
  RHYTHM_FAMILY_LABEL,
  RHYTHM_LABEL,
  type EcgRhythmFamily,
  type EcgRhythmKind,
} from '@/lib/ecg-rhythm';
import { ACS_PATTERNS, ACS_PATTERN_KINDS } from '@/lib/ecg-acs';

const RHYTHM_GROUPS: Record<EcgRhythmFamily, EcgRhythmKind[]> = (() => {
  const groups: Record<EcgRhythmFamily, EcgRhythmKind[]> = {
    sinus: [],
    atrial: [],
    junctional: [],
    av_block: [],
    paced: [],
    ventricular: [],
    arrest: [],
  };
  for (const kind of ALL_ECG_RHYTHM_KINDS) {
    if (kind === 'unknown') continue;
    groups[RHYTHM_FAMILY[kind]].push(kind);
  }
  return groups;
})();

const COMORBIDITY_OPTIONS = Object.entries(COMORBIDITY_MATRIX)
  .map(([, mod]) => ({ id: mod.id, name: mod.name, category: mod.category }))
  .sort((a, b) => a.name.localeCompare(b.name));

interface ScenarioFormProps {
  onSubmit: (values: Omit<Scenario, 'id'>, id?: string) => void;
  defaultValues?: Scenario | null;
  onCancel: () => void;
}

const TagInput = ({ field }: { field: any }) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const value = e.currentTarget.value.trim();
            if (value && !field.value.includes(value)) {
                field.onChange([...field.value, value]);
                e.currentTarget.value = '';
            }
        }
    };
    return <Input {...field} onKeyDown={handleKeyDown} placeholder="Type a tag and press Enter" value={Array.isArray(field.value) ? field.value.join(', ') : ''} onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()))}/>;
}


const ActionTextarea = ({ field }: { field: any }) => (
    <Textarea
      {...field}
      placeholder="Enter one action per line"
      rows={4}
      value={Array.isArray(field.value) ? field.value.join('\n') : ''}
      onChange={(e) => field.onChange(e.target.value.split('\n'))}
    />
);


export function ScenarioForm({ onSubmit, defaultValues, onCancel }: ScenarioFormProps) {
  
  const hospitalDefaults = hospitals.reduce((acc, hospital) => {
    acc[hospital.id] = defaultValues?.hospitalDistances?.[hospital.id] || 0;
    return acc;
  }, {} as Record<string, number>);
  
  const form = useForm<Omit<Scenario, 'id'>>({
    resolver: zodResolver(ScenarioSchema.omit({ id: true })),
    defaultValues: {
        title: defaultValues?.title || '',
        description: defaultValues?.description || '',
        status: defaultValues?.status || 'draft',
        isPremium: defaultValues?.isPremium ?? false,
        category: defaultValues?.category || undefined,
        patientProfile: defaultValues?.patientProfile || '',
        details: defaultValues?.details || '',
        difficulty: defaultValues?.difficulty || 'Beginner',
        tags: defaultValues?.tags || [],
        initialVitals: defaultValues?.initialVitals || { hr: '', bp: '', rr: '', spo2: '', gcs: '' },
        destination: defaultValues?.destination || '',
        destinationRationale: defaultValues?.destinationRationale || '',
        hospitalDistances: hospitalDefaults,
        mandatoryActions: defaultValues?.mandatoryActions || { emt: [], aemt: [], paramedic: [] },
        suggestedActions: defaultValues?.suggestedActions || { emt: [], aemt: [], paramedic: [] },
        criticalFailures: defaultValues?.criticalFailures || [],
        comorbidities: defaultValues?.comorbidities ?? [],
        patientPresentation: defaultValues?.patientPresentation ?? '',
        defaultWeightKg: defaultValues?.defaultWeightKg,
        ageBand: defaultValues?.ageBand,
        icpMmHg: defaultValues?.icpMmHg,
        autonomicProfile: {
          initialVolumeMl: defaultValues?.autonomicProfile?.initialVolumeMl,
          baselineBleedRateMlPerMin: defaultValues?.autonomicProfile?.baselineBleedRateMlPerMin,
          baselineDistributiveToneFactor: defaultValues?.autonomicProfile?.baselineDistributiveToneFactor,
          baselineMapMmHg: defaultValues?.autonomicProfile?.baselineMapMmHg,
          initialPulmonaryEdemaSeverity: defaultValues?.autonomicProfile?.initialPulmonaryEdemaSeverity,
          initialTensionPneumoSeverity: defaultValues?.autonomicProfile?.initialTensionPneumoSeverity,
          initialDecompensationPhase:
            defaultValues?.autonomicProfile?.initialDecompensationPhase,
        },
        initialRhythm: defaultValues?.initialRhythm,
        acsPattern: defaultValues?.acsPattern,
    },
  });

  const handleSubmit = (values: Omit<Scenario, 'id'>) => {
    const v = { ...values };
    for (const key of ['defaultWeightKg', 'icpMmHg'] as const) {
      const n = v[key];
      if (n !== undefined && (typeof n !== 'number' || !Number.isFinite(n))) {
        delete (v as Record<string, unknown>)[key];
      }
    }
    onSubmit(v, defaultValues?.id);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
                 <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="isPremium"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                      <FormLabel>Premium Scenario</FormLabel>
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          id="is-premium-switch"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                        />
                        <Label htmlFor="is-premium-switch" className="capitalize">
                          {field.value ? 'Premium' : 'Standard'}
                        </Label>
                      </div>
                      <FormDescription>
                        If enabled, learners must be subscribed to Premium to start this scenario.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Anaphylactic Shock" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Short Description</FormLabel>
                    <FormControl>
                        <Textarea placeholder="A brief, one-sentence description of the scenario." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="patientProfile"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Patient Profile</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., 25 y/o Female, known allergy to bees." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                  control={form.control}
                  name="patientPresentation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient presentation (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Short structured presentation line for reports / AI (optional)."
                          rows={3}
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional adjunct to the narrative details; used where a concise presentation string is helpful.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Full Scenario Details</FormLabel>
                    <FormControl>
                        <Textarea placeholder="The detailed narrative for the simulation start." rows={6} {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="grid grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="difficulty"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Difficulty</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Beginner">Beginner</SelectItem>
                                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                                    <SelectItem value="Advanced">Advanced</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Special Category (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="cardiac-arrest">Cardiac Arrest</SelectItem>
                            </SelectContent>
                        </Select>
                         <FormDescription>Used for special UI workflows, like the cardiac arrest tab.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                           <TagInput field={field} />
                        </FormControl>
                         <FormDescription>Comma-separated or press Enter after each tag.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <Card>
                    <CardHeader><CardTitle>Initial Vitals</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="initialVitals.hr" render={({ field }) => (<FormItem><FormLabel>HR</FormLabel><FormControl><Input placeholder="e.g., 120 bpm" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="initialVitals.bp" render={({ field }) => (<FormItem><FormLabel>BP</FormLabel><FormControl><Input placeholder="e.g., 90/50 mmHg" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="initialVitals.rr" render={({ field }) => (<FormItem><FormLabel>RR</FormLabel><FormControl><Input placeholder="e.g., 28/min" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="initialVitals.spo2" render={({ field }) => (<FormItem><FormLabel>SpO2</FormLabel><FormControl><Input placeholder="e.g., 91%" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="initialVitals.gcs" render={({ field }) => (<FormItem><FormLabel>GCS</FormLabel><FormControl><Input placeholder="e.g., 15" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Initial Rhythm</CardTitle></CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="initialRhythm"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ECG Rhythm</FormLabel>
                                    <Select
                                        onValueChange={(value) =>
                                          field.onChange(value === '__auto__' ? undefined : value)
                                        }
                                        value={field.value ?? '__auto__'}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Auto (let AI pick)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="__auto__">Auto (let AI pick)</SelectItem>
                                            {Object.entries(RHYTHM_GROUPS).map(([family, kinds]) =>
                                              kinds.length === 0 ? null : (
                                                <div key={family}>
                                                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                                                    {RHYTHM_FAMILY_LABEL[family as EcgRhythmFamily]}
                                                  </div>
                                                  {kinds.map((kind) => (
                                                    <SelectItem key={kind} value={kind}>
                                                      {RHYTHM_LABEL[kind]}
                                                    </SelectItem>
                                                  ))}
                                                </div>
                                              ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Leave on Auto to let the patient AI choose a rhythm consistent with the scenario presentation.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>ACS Pattern</CardTitle></CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="acsPattern"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ST/T injury pattern</FormLabel>
                                    <Select
                                        onValueChange={(value) =>
                                          field.onChange(value === '__auto__' ? undefined : value)
                                        }
                                        value={field.value ?? '__auto__'}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Auto (from scenario text)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="__auto__">Auto (from scenario text)</SelectItem>
                                            {ACS_PATTERN_KINDS.filter((k) => k !== 'none').map((kind) => (
                                                <SelectItem key={kind} value={kind}>
                                                    {ACS_PATTERNS[kind].label}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="none">None (no ST shift)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Drives ST elevation / depression across all 12 leads from a single injury vector. Pick a preset for STEMI / NSTEMI / pericarditis scenarios; leave on Auto to fall back to keyword detection.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <FormField
                  control={form.control}
                  name="comorbidities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comorbidities (structured)</FormLabel>
                      <FormDescription>
                        Overrides pathophysiology text extraction when set. Select condition IDs applied before simulation axes resolve.
                      </FormDescription>
                      <ScrollArea className="h-52 rounded-md border">
                        <div className="space-y-2 p-3">
                          {COMORBIDITY_OPTIONS.map((row) => (
                            <label
                              key={row.id}
                              className="flex cursor-pointer items-start gap-2 rounded-sm py-1 text-sm leading-tight hover:bg-muted/50"
                            >
                              <Checkbox
                                checked={(field.value ?? []).includes(row.id)}
                                onCheckedChange={(checked) => {
                                  const cur = new Set(field.value ?? []);
                                  if (checked) cur.add(row.id);
                                  else cur.delete(row.id);
                                  field.onChange([...cur]);
                                }}
                              />
                              <span>
                                <span className="font-medium">{row.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {row.id}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Pediatrics & ICP (optional)</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="defaultWeightKg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (kg)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={0.1}
                              placeholder="e.g., 32 — overrides cohort default mass"
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                field.onChange(
                                  v === ''
                                    ? undefined
                                    : Number.parseFloat(v),
                                );
                              }}
                            />
                          </FormControl>
                          <FormDescription>PK volume scaling; pediatric cohort default if unset.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ageBand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age band</FormLabel>
                          <Select
                            onValueChange={(v) =>
                              field.onChange(
                                v === '__none__' ? undefined : v,
                              )
                            }
                            value={field.value ?? '__none__'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Not specified" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Not specified</SelectItem>
                              <SelectItem value="adult">Adult</SelectItem>
                              <SelectItem value="pediatric">Pediatric cohort (legacy)</SelectItem>
                              <SelectItem value="neonate">Neonate</SelectItem>
                              <SelectItem value="infant">Infant</SelectItem>
                              <SelectItem value="toddler">Toddler</SelectItem>
                              <SelectItem value="child">Child</SelectItem>
                              <SelectItem value="adolescent">Adolescent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="icpMmHg"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>ICP (mmHg) for teaching CPP</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              placeholder="Optional — CPP ≈ MAP − ICP on monitor"
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                field.onChange(
                                  v === ''
                                    ? undefined
                                    : Number.parseFloat(v),
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Collapsible className="rounded-lg border bg-card">
                  <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-3 text-left font-medium hover:bg-muted/40">
                    <span>Autonomic seed (optional)</span>
                    <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t px-4 pb-4 pt-2">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="autonomicProfile.initialVolumeMl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initial volume (mL)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  field.onChange(
                                    v === '' ? undefined : Number.parseFloat(v),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="autonomicProfile.baselineBleedRateMlPerMin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bleed rate (mL/min)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  field.onChange(
                                    v === '' ? undefined : Number.parseFloat(v),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="autonomicProfile.baselineDistributiveToneFactor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Distributive tone factor (0–1)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step={0.01}
                                min={0}
                                max={1}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  field.onChange(
                                    v === '' ? undefined : Number.parseFloat(v),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="autonomicProfile.baselineMapMmHg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Baseline MAP (mmHg)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  field.onChange(
                                    v === '' ? undefined : Number.parseFloat(v),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="autonomicProfile.initialPulmonaryEdemaSeverity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pulmonary edema severity (0–1)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step={0.05}
                                min={0}
                                max={1}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  field.onChange(
                                    v === '' ? undefined : Number.parseFloat(v),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="autonomicProfile.initialTensionPneumoSeverity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tension pneumo severity (0–1)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step={0.05}
                                min={0}
                                max={1}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  field.onChange(
                                    v === '' ? undefined : Number.parseFloat(v),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="autonomicProfile.initialDecompensationPhase"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Initial decompensation phase</FormLabel>
                            <Select
                              onValueChange={(v) =>
                                field.onChange(
                                  v === '__engine__' ? undefined : v,
                                )
                              }
                              value={field.value ?? '__engine__'}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Engine default" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="__engine__">Engine default</SelectItem>
                                <SelectItem value="baseline">baseline</SelectItem>
                                <SelectItem value="compensated">compensated</SelectItem>
                                <SelectItem value="decompensating">decompensating</SelectItem>
                                <SelectItem value="crashing">crashing</SelectItem>
                                <SelectItem value="arrested">arrested</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

            </div>

            {/* Right Column */}
            <div className="space-y-6">
                 <Card>
                    <CardHeader><CardTitle>Destination</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <FormField
                            control={form.control}
                            name="destination"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Correct Destination</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a hospital" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {hospitals.map(h => <SelectItem key={h.id} value={h.name}>{h.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="destinationRationale"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Rationale</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Explain why this is the correct destination." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div>
                            <FormLabel>Scenario Travel Times (minutes)</FormLabel>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                            {hospitals.map(h => (
                                <FormField
                                    key={h.id}
                                    control={form.control}
                                    name={`hospitalDistances.${h.id}`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-normal">{h.name}</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Action Items</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <h3 className="font-semibold">Mandatory Actions</h3>
                        <FormField control={form.control} name="mandatoryActions.emt" render={({ field }) => (<FormItem><FormLabel>EMT</FormLabel><FormControl><ActionTextarea field={field}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="mandatoryActions.aemt" render={({ field }) => (<FormItem><FormLabel>AEMT</FormLabel><FormControl><ActionTextarea field={field}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="mandatoryActions.paramedic" render={({ field }) => (<FormItem><FormLabel>Paramedic</FormLabel><FormControl><ActionTextarea field={field}/></FormControl><FormMessage /></FormItem>)}/>
                        
                        <h3 className="font-semibold pt-4">Suggested Actions</h3>
                        <FormField control={form.control} name="suggestedActions.emt" render={({ field }) => (<FormItem><FormLabel>EMT</FormLabel><FormControl><ActionTextarea field={field}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="suggestedActions.aemt" render={({ field }) => (<FormItem><FormLabel>AEMT</FormLabel><FormControl><ActionTextarea field={field}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="suggestedActions.paramedic" render={({ field }) => (<FormItem><FormLabel>Paramedic</FormLabel><FormControl><ActionTextarea field={field}/></FormControl><FormMessage /></FormItem>)}/>
                        
                        <h3 className="font-semibold pt-4">Critical Failures</h3>
                        <FormField control={form.control} name="criticalFailures" render={({ field }) => (<FormItem><FormLabel>All Levels</FormLabel><FormControl><ActionTextarea field={field}/></FormControl><FormMessage /></FormItem>)}/>
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-8">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : (defaultValues ? 'Save Changes' : 'Create Scenario')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
