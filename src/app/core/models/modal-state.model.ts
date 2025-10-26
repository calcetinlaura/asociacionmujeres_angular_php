import { AgentModel } from '../interfaces/agent.interface';
import { ArticleModel } from '../interfaces/article.interface';
import { BookModel } from '../interfaces/book.interface';
import {
  EventModel,
  EventModelFullData,
  EventReportModel,
} from '../interfaces/event.interface';
import {
  InvoiceModel,
  InvoiceModelFullData,
} from '../interfaces/invoice.interface';
import {
  MacroeventModel,
  MacroeventModelFullData,
} from '../interfaces/macroevent.interface';
import { MovieModel } from '../interfaces/movie.interface';
import { PartnerModel } from '../interfaces/partner.interface';
import { PiteraModel } from '../interfaces/pitera.interface';
import { PlaceModel } from '../interfaces/place.interface';
import { PodcastModel } from '../interfaces/podcast.interface';
import {
  ProjectModel,
  ProjectModelFullData,
} from '../interfaces/project.interface';
import { RecipeModel } from '../interfaces/recipe.interface';
import {
  SubsidyModel,
  SubsidyModelFullData,
} from '../interfaces/subsidy.interface';
import { TypeActionModal, TypeList } from './general.model';

// export type TypeActionModal = 'EDIT' | 'DELETE' | 'SHOW' | 'CREATE';
export interface ModalState<TItem = unknown> {
  action: TypeActionModal;
  item: TItem | null;
}
export type ModalItemByType = {
  [TypeList.Events]: EventModel | EventModelFullData | null;
  [TypeList.EventsReports]: EventReportModel | { id: number } | null;
  [TypeList.MultiEvents]: { date: Date; events: EventModel[] };
  [TypeList.Macroevents]:
    | MacroeventModel
    | MacroeventModelFullData
    | { id: number }
    | null;
  [TypeList.Books]: BookModel | { id: number } | null;
  [TypeList.Movies]: MovieModel | { id: number } | null;
  [TypeList.Recipes]: RecipeModel | { id: number } | null;
  [TypeList.Piteras]: PiteraModel | { id: number } | null;
  [TypeList.Podcasts]: PodcastModel | { id: number } | null;
  [TypeList.Articles]: ArticleModel | { id: number } | null;
  [TypeList.Places]: PlaceModel | { id: number } | null;
  [TypeList.Partners]: PartnerModel | { id: number } | null;
  [TypeList.Agents]: AgentModel | { id: number } | null;
  [TypeList.Projects]:
    | ProjectModel
    | ProjectModelFullData
    | { id: number }
    | null;
  [TypeList.Subsidies]:
    | SubsidyModel
    | SubsidyModelFullData
    | { id: number }
    | null;
  [TypeList.Invoices]:
    | InvoiceModel
    | InvoiceModelFullData
    | { id: number }
    | null;
};

export type ModalStateByType<T extends keyof ModalItemByType> = {
  type: T;
  action: TypeActionModal;
  item: ModalItemByType[T];
};
