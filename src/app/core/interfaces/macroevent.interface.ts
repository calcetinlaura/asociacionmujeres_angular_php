import { EventModelFullData } from './event.interface';

export interface MacroeventModel {
  id: number;
  title: string;
  start: string;
  end: string;
  description?: string;
  province: string;
  town: string;
  img?: string;
}
export interface MacroeventModelFullData extends MacroeventModel {
  events?: EventModelFullData[];
}
