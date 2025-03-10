export interface PartnerModel {
  id: number;
  name: string;
  surname?: string;
  birthday?: string;
  post_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  town?: string;
  cuotas: number[];
  [key: string]: any;
}
