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
  cuotas: number[];
  img?: string;
  observations?: string;
  death: boolean;
  unsubscribe: boolean;
  [key: string]: any;
}
