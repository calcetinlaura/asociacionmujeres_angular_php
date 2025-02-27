export interface CreditorModel {
  id: number;
  company: string;
  cif?: string;
  contact?: string;
  phone: string;
  email: string;
  town: string;
  address: string;
  postCode: string;
}
export interface CreditorAutocompleteModel {
  id: number;
  company: string;
  cif?: string;
}
