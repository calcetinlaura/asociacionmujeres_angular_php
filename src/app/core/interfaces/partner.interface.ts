export interface PartnerModel {
  id?: number;
  name: string;
  surname: string;
  birthday?: string;
  postCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  town?: string;
  img?: string;
  cuotas: number[];
  [key: string]: any;
}
