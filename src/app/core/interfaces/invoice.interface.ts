export interface InvoiceModel {
  id: number;
  number_invoice?: string;
  type_invoice: string;
  date_invoice: string;
  date_accounting?: string;
  date_payment?: string;
  creditor_id?: number | null;
  description?: string;
  concept: string;
  amount?: number;
  irpf?: number;
  iva?: number;
  total_amount: number;
  total_amount_irpf?: number;
  subsidy_id?: number;
  project_id?: number;
  invoice_pdf?: string;
  proof_pdf?: string;
}
export interface InvoiceModelFullData extends InvoiceModel {
  creditor_company?: string;
  creditor_contact?: string;
  creditor_cif?: string;
  subsidy_name: string;
  project_title: string;
}
export interface InvoicePdf {
  invoice_pdf?: string;
  proof_pdf?: string;
  year?: number | string;
}
