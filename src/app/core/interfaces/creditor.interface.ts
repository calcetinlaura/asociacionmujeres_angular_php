import { Filter } from '../models/general.model';
import { InvoiceModel } from './invoice.interface';

export interface CreditorModel {
  id: number;
  company: string;
  cif?: string;
  contact?: string;
  phone?: string;
  email?: string;
  town?: string;
  address?: string;
  post_code?: string;
  category?: string;
  key_words?: string;
  observations?: string;
}
export interface CreditorWithInvoices extends CreditorModel {
  numInvoices: number;
  invoiceIds: number[]; // Lista de IDs de facturas
  invoices: InvoiceModel[];
}
export interface CreditorAutocompleteModel {
  id: number;
  company: string;
  cif?: string;
}
export const FilterCreditors: Filter[] = [
  { code: 'CINE', name: 'Cine' },
  { code: 'COCINE', name: 'Cocina' },
  { code: 'CHARLAS', name: 'Charlas' },
  { code: 'LOGÍSTICA', name: 'Logística y materiales' },
  { code: 'CURSOS', name: 'Cursos y talleres' },
  { code: 'ESPECTÁCULOS', name: 'Espectáculos' },
  { code: 'DISEÑO', name: 'Diseño gráfico e ilustración' },
  { code: 'FOTOGRAFIA', name: 'Fotografía' },
  { code: 'VIAJES', name: 'Viajes' },
];
