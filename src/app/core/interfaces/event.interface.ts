export interface EventModel {
  title: string;
  start: string;
  end: string;
  time?: string;
  description?: string;
  town: string;
  place?: string;
  capacity?: number;
  price?: string;
  img?: string;
  status?: string;
  statusReason?: string;
  inscription?: boolean;
}
export interface EventModelDate {
  title: string;
  start: Date;
  end: Date;
  time?: string;
  description?: string;
  town: string;
  place?: string;
  capacity?: number;
  price?: string;
  img?: string;
  status?: string;
  statusReason?: string;
  inscription?: boolean;
}
