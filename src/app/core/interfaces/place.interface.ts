import { Filter } from 'src/app/core/models/general.model';

export interface PlaceModel {
  id: number;
  name: string;
  province?: string;
  town?: string;
  address?: string;
  post_code?: string;
  lat?: number;
  lon?: number;
  capacity?: number;
  description?: string;
  observations?: string;
  management?: string;
  type?: string;
  img?: string;
  salas?: SalaModel[];
}

export interface SalaModel {
  sala_id: number;
  place_id: number;
  name: string;
  type?: string;
  capacity?: number;
  location?: string;
}

export const ManagementFilterPlaces: Filter[] = [
  { code: 'PRIVADA', name: 'Espacio privado' },
  { code: 'PUBLICA', name: 'Espacio público' },
];
export const TypeFilterPlaces: Filter[] = [
  { code: 'EXTERIOR', name: 'Al aire libre' },
  { code: 'INTERIOR', name: 'Interior' },
];
