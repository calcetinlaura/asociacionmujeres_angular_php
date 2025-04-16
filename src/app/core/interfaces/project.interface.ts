import { EventModel } from './event.interface';

export interface ProjectModel {
  id: number;
  title: string;
  year: number;
  description?: string;
  subsidy_id?: number;
  img?: string;
}
export interface ProjectModelFullData extends ProjectModel {
  subsidy_name?: string;
  events?: EventModel[];
  projects?: ProjectModel[];
}
