export interface PartnerModel {
  id: number;
  name: string;
  surname?: string;
  birthday?: string;
  province?: string;
  town?: string;
  post_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  cuotas: CuotaModel[];
  img?: string;
  observations?: string;
  death: boolean;
  unsubscribe: boolean;
  [key: string]: any;
}
export type PaymentMethod = 'cash' | 'domiciliation';

export interface CuotaModel {
  year: number;
  paid: boolean;
  date_payment?: string | null;
  method_payment?: PaymentMethod | null;
}
