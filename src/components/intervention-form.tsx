
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import type { Intervention } from '@/lib/types';
import { InterventionSchema, interventionCertifications } from '@/lib/types';
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
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from './ui/separator';

interface InterventionFormProps {
  onSubmit: (values: Omit<Intervention, 'id'>) => void;
  defaultValues?: Intervention | null;
  onCancel: () => void;
}

export function InterventionForm({ onSubmit, defaultValues, onCancel }: InterventionFormProps) {
  const form = useForm<Omit<Intervention, 'id'>>({
    resolver: zodResolver(InterventionSchema.omit({ id: true })),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      indication: defaultValues?.indication || '',
      mechanism: defaultValues?.mechanism || '',
      certificationLevel: defaultValues?.certificationLevel || 'emt',
      subOptions: defaultValues?.subOptions || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'subOptions',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Oxygen Administration" {...field} />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the intervention..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="indication"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Indications (Why)</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe when this intervention is indicated..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="mechanism"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mechanism of Action (What it does)</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe how this intervention works..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="certificationLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Certification Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a certification level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {interventionCertifications.map(level => (
                    <SelectItem key={level} value={level} className="capitalize">
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
            <h3 className="text-lg font-medium mb-2">Sub-Options</h3>
             <Separator className="mb-4" />
            {fields.map((field, index) => (
                <div key={field.id} className="p-4 mb-4 border rounded-md relative">
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                        onClick={() => remove(index)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <FormField
                        control={form.control}
                        name={`subOptions.${index}.label`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Parameter Label</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Dosage" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`subOptions.${index}.options`}
                        render={({ field }) => (
                            <FormItem className="mt-4">
                                <FormLabel>Available Options</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., 10mg, 20mg, 30mg" {...field} onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()))} value={Array.isArray(field.value) ? field.value.join(', ') : ''} />
                                </FormControl>
                                <FormDescription>Enter comma-separated values.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            ))}
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ label: '', options: [] })}
            >
                <PlusCircle className="mr-2" />
                Add Sub-Option
            </Button>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {defaultValues ? 'Save Changes' : 'Create Intervention'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
