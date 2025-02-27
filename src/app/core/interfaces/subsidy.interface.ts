export interface SubsidyModel {
  id?: number;
  name?: string;
  year: number;
  datePresentation: Date | null;
  dateJustification: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  activities?: string;
  invoices?: string;
  urlPresentation?: string;
  urlJustification?: string;
  amountRequested: number;
  amountGranted?: number;
  amountJustified?: number;
  amountAssociation?: number;
  observations?: string;
}
