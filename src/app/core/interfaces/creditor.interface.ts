import { Filter } from 'src/app/core/models/general.model';
import { InvoiceModelFullData } from './invoice.interface';

export interface CreditorModel {
  id: number;
  company: string;
  cif?: string;
  contact?: string;
  phone?: string;
  email?: string;
  province?: string;
  town?: string;
  address?: string;
  post_code?: string;
  category?: string;
  key_words?: string;
  observations?: string;
}
export interface CreditorWithInvoices extends CreditorModel {
  invoiceIds: number[]; // Lista de IDs de facturas
  invoices: InvoiceModelFullData[];
}
export interface CreditorAutocompleteModel {
  id: number;
  company: string;
  cif?: string;
}
export const categoryFilterCreditors: Filter[] = [
  { code: 'CINE', name: 'Cine' },
  { code: 'COCINA', name: 'Cocina' },
  { code: 'CHARLAS', name: 'Charlas' },
  { code: 'LOGÍSTICA', name: 'Logística y materiales' },
  { code: 'CURSOS', name: 'Cursos y talleres' },
  { code: 'ESPECTÁCULOS', name: 'Espectáculos' },
  { code: 'DISEÑO', name: 'Diseño gráfico e ilustración' },
  { code: 'FOTOGRAFIA', name: 'Fotografía' },
  { code: 'VIAJES', name: 'Viajes' },
];
