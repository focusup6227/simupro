
import type { Hospital } from './types';

export const hospitals: Omit<Hospital, 'distance'>[] = [
    {
        id: 'mercy_general',
        name: 'Mercy General Hospital',
        capabilities: ['cath lab', 'neuro', 'psych'],
    },
    {
        id: 'county_trauma_center',
        name: 'County Trauma Center',
        capabilities: ['trauma', 'cath lab', 'neuro'],
    },
    {
        id: 'st_marys_community',
        name: 'St. Mary\'s Community Hospital',
        capabilities: ['OB', 'psych'],
    },
    {
        id: 'university_medical',
        name: 'University Medical Center',
        capabilities: ['trauma', 'cath lab', 'neuro', 'OB', 'psych'],
    },
    {
        id: 'hope_psychiatric',
        name: 'Hope Psychiatric Institute',
        capabilities: ['psych'],
    }
];
