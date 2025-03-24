export interface SubsidyModel {
  id?: number;
  name?: string;
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
