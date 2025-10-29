import { Filter } from 'src/app/core/interfaces/general.interface';
import { InvoiceModelFullData } from './invoice.interface';
import { ProjectModelFullData } from './project.interface';

/** Fechas: el backend puede enviar string; en UI puedes convertir a Date cuando lo necesites */
export type DateLike = string | Date | null;

/** Códigos oficiales de subvención admitidos en la app */
export type SubsidyName =
  | 'AYUNT_EQUIPAMIENTO'
  | 'AYUNT_ACTIVIDADES'
  | 'DIPUTACION'
  | 'GENERALITAT'
  | 'MINISTERIO';

/** Tipos de movimiento (útil para facturas / listados) */
export type MovementType = 'TICKET' | 'INVOICE' | 'INCOME';

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
  amount_spent?: number;
  amount_spent_irpf?: number;
  amount_association?: number;
  amount_association_irpf?: number;
  observations?: string;
}

export interface SubsidyModelFullData extends SubsidyModel {
  invoices?: InvoiceModelFullData[];
  projects?: ProjectModelFullData[];
}

/** Labels legibles por usuario para cada SubsidyName */
export const SUBSIDY_NAME_LABELS: Record<SubsidyName, string> = {
  GENERALITAT: 'Generalitat',
  DIPUTACION: 'Diputación',
  AYUNT_EQUIPAMIENTO: 'Ayunt. Equipamiento',
  AYUNT_ACTIVIDADES: 'Ayunt. Actividades',
  MINISTERIO: 'Ministerio',
};

/** Labels legibles por usuario para tipos de movimiento */
export const MOVEMENT_LABELS: Record<MovementType, string> = {
  TICKET: 'Ticket',
  INVOICE: 'Factura',
  INCOME: 'Ingreso',
};

/** Filtros por categoría para la UI (derivados de los labels, sin duplicar datos) */
export const categoryFilterSubsidies: Filter[] = (
  Object.keys(SUBSIDY_NAME_LABELS) as SubsidyName[]
).map((code) => ({
  code,
  name: SUBSIDY_NAME_LABELS[code],
}));

/** Helpers útiles */
export const getSubsidyLabel = (code: SubsidyName): string =>
  SUBSIDY_NAME_LABELS[code];

export const isSubsidyName = (value: unknown): value is SubsidyName =>
  typeof value === 'string' && value in SUBSIDY_NAME_LABELS;

export const getMovementLabel = (type: MovementType): string =>
  MOVEMENT_LABELS[type];

export const isMovementType = (v: unknown): v is MovementType =>
  v === 'TICKET' || v === 'INVOICE' || v === 'INCOME';
