import { PlaceModel } from './place.interface';

export interface EventModel {
  id: number;
  title: string;
  start: string;
  end: string;
  time?: string;
  description?: string;
  province: string;
  town: string;
  place?: number;
  capacity?: number;
  price?: string;
  img?: string;
  status?: string;
  status_reason?: string;
  inscription?: boolean;
}

export interface EventWithPlaceModel extends EventModel {
  placeData?: PlaceModel;
}
