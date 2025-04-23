import { Filter } from '../models/general.model';
import { InvoiceModel } from './invoice.interface';
import { ProjectModelFullData } from './project.interface';

export interface SubsidyModel {
  id?: number;
  name: string;
  year: number;
  date_presentation?: Date | null;
  date_justification?: Date | null;
  start?: Date | null;
  end?: Date | null;
  url_presentation?: string;
  url_justification?: string;
  amount_requested: number;
  amount_granted?: number;
  amount_justified?: number;
  amount_association?: number;
  observations?: string;
}
export interface SubsidyModelFullData extends SubsidyModel {
  invoices?: InvoiceModel[];
  projects?: ProjectModelFullData[];
}

export const categoryFilterSubsidies: Filter[] = [
  { code: 'AYUNT_EQUIPAMIENTO', name: 'Ayuntamiento Equipamiento' },
  { code: 'AYUNT_ACTIVIDADES', name: 'Ayuntamiento Actividades' },
  { code: 'DIPUTACION', name: 'Diputación' },
  { code: 'GENERALITAT', name: 'Generalitat' },
  { code: 'MINISTERIO', name: 'Ministerio' },
];
