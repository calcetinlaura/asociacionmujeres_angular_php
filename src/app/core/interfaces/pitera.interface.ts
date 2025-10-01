export interface PiteraModel {
  id: number;
  publication_number: number;
  title: string;
  year: number;
  url?: File;
  theme: string;
  description: string;
  img?: string;
  pages?: number;
}
