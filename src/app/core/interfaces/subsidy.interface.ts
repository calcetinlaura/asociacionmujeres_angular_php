import { Filter } from '../models/general.model';

export interface SubsidyModel {
  id?: number;
  name: string;
  year: number;
  date_presentation: Date | null;
  date_justification: Date | null;
  period_start: Date | null;
  period_end: Date | null;
  activities?: string;
  invoices?: string;
  url_presentation?: string;
  url_justification?: string;
  amount_requested: number;
  amount_granted?: number;
  amount_justified?: number;
  amount_association?: number;
  observations?: string;
}

export const categoryFilterSubsidies: Filter[] = [
  { code: 'AYUNT_EQUIPAMIENTO', name: 'Ayuntamiento Equipamiento' },
  { code: 'AYUNT_ACTIVIDADES', name: 'Ayuntamiento Actividades' },
  { code: 'DIPUTACION', name: 'Diputación' },
  { code: 'GENERALITAT', name: 'Generalitat' },
  { code: 'MINISTERIO', name: 'Ministerio' },
];
