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
  type_room?: string;
  type_ubication?: string;
  img?: string;
  salas?: SalaModel[];
}

export interface SalaModel {
  sala_id: number;
  place_id: number;
  name: string;
  type_ubication?: string;
  capacity?: number;
  room_location?: string;
}

export const ManagementFilterPlaces: Filter[] = [
  { code: 'PRIVATE', name: 'Espacio privado' },
  { code: 'PUBLIC', name: 'Espacio público' },
];
export const TypeFilterPlaces: Filter[] = [
  { code: 'EXTERIOR', name: 'Al aire libre' },
  { code: 'INTERIOR', name: 'Interior' },
];
export const RoomFilterPlaces: Filter[] = [
  { code: 'MULTIPLE', name: 'Multisalas' },
  { code: 'SINGLE', name: 'Espacio único' },
];
export const RoomLocationFilterPlaces: Filter[] = [
  { code: '0', name: 'Planta baja' },
  { code: '1', name: '1ª Planta' },
  { code: '2', name: '2ª Planta' },
];
