
'use client';

import { useState, useMemo } from 'react';
import type { Intervention } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface InterventionGuideProps {
  interventions: Intervention[];
}

export function InterventionGuide({ interventions }: InterventionGuideProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInterventions = useMemo(() => {
    if (!interventions) return [];
    return interventions.filter((intervention) => {
        const nameMatch = intervention.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const descriptionMatch = intervention.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const indicationMatch = intervention.indication?.toLowerCase().includes(searchTerm.toLowerCase());
        const mechanismMatch = intervention.mechanism?.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || descriptionMatch || indicationMatch || mechanismMatch;
    });
  }, [interventions, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search interventions..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <ScrollArea className="h-[55vh]">
        <Accordion type="single" collapsible className="w-full">
          {filteredInterventions.map((intervention) => (
            <AccordionItem value={intervention.id} key={intervention.id}>
              <AccordionTrigger>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-left">{intervention.name}</span>
                  <Badge variant="secondary" className="capitalize">
                    {intervention.certificationLevel}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 px-2">
                <p className="text-sm text-muted-foreground">{intervention.description}</p>
                
                {intervention.indication && (
                    <div>
                        <h4 className="font-semibold text-sm">Indications (Why)</h4>
                        <p className="text-sm text-muted-foreground">{intervention.indication}</p>
                    </div>
                )}
                
                {intervention.mechanism && (
                    <div>
                        <h4 className="font-semibold text-sm">Mechanism (What it does)</h4>
                        <p className="text-sm text-muted-foreground">{intervention.mechanism}</p>
                    </div>
                )}
                
                {intervention.subOptions && intervention.subOptions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm">Parameters</h4>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      {intervention.subOptions.map((so) => (
                        <li key={so.label}>
                          <span className="font-medium">{so.label}:</span> {so.options.join(', ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
         {filteredInterventions.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
                <p>No interventions found.</p>
            </div>
        )}
      </ScrollArea>
    </div>
  );
}
