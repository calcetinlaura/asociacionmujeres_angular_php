import { EventModel } from './event.interface';
import { InvoiceModelFullData } from './invoice.interface';

export interface ProjectModel {
  id: number;
  title: string;
  year: number;
  description?: string;
  subsidy_id?: number;
  img?: string;
  activities?: ActivityModel[];
}

export interface ActivityModel {
  activity_id: number;
  name: string;
  budget?: number;
  attendant?: string;
  observations?: string;
}
export interface ProjectModelFullData extends ProjectModel {
  subsidy_name?: string;
  events?: EventModel[];
  invoices?: InvoiceModelFullData[];
}
