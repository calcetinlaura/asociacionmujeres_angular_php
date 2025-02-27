export interface InvoiceModel {
  numberInvoice?: string;
  typeInvoice: string;
  dateInvoice?: string; // Cambiar a string
  dateAccounting?: string; // Cambiar a string
  datePayment?: string;
  creditorId?: number | null;
  description: string;
  amount?: number;
  irpf?: number;
  iva?: number;
  totalAmount: number;
  totalAmountIrpf?: number;
  subsidy?: string;
  subsidyYear?: number;
}
