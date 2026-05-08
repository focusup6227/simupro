
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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
        initialRhythm: defaultValues?.initialRhythm,
        acsPattern: defaultValues?.acsPattern,
    },
  });

  const handleSubmit = (values: Omit<Scenario, 'id'>) => {
    onSubmit(values, defaultValues?.id);
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
