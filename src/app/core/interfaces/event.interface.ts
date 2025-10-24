// src/app/core/interfaces/event.interface.ts
import { SocialNetwork } from 'src/app/shared/utils/social.utils';
import { Filter } from '../models/general.model';
import { AgentAutocompleteModel } from './agent.interface';
import { MacroeventModel } from './macroevent.interface';
import { PlaceModel, SalaModel } from './place.interface';
import { ProjectModel } from './project.interface';

/* ===== Enums y tipos base ===== */

export enum EnumStatusEvent {
  EJECUCION = 'EJECUCION',
  CANCELADO = 'CANCELADO',
  APLAZADO = 'APLAZADO',
  AGOTADO = 'AGOTADO',
}

export type EventAccess = 'FREE' | 'TICKETS' | 'UNSPECIFIED';

export type CategoryCode =
  | 'CINEMA'
  | 'WORKSHOP'
  | 'THEATER'
  | 'ACTIVISM'
  | 'MUSIC'
  | 'TALK'
  | 'EXPOSURE'
  | 'LEISURE'
  | 'LITERATURE'
  | 'COURSE';

export const CATEGORY_UI: Record<
  CategoryCode,
  { label: string; icon: string }
> = {
  CINEMA: { label: 'Cine', icon: 'uil-film' },
  WORKSHOP: { label: 'Taller', icon: 'uil-palette' },
  THEATER: { label: 'Teatro', icon: 'uil-ticket' },
  ACTIVISM: { label: 'Activismo', icon: 'uil-megaphone' },
  MUSIC: { label: 'Música', icon: 'uil-music' },
  TALK: { label: 'Charla', icon: 'uil-meeting-board' },
  EXPOSURE: { label: 'Exposición', icon: 'uil-images' },
  LEISURE: { label: 'Ocio', icon: 'uil-smile' },
  LITERATURE: { label: 'Literatura', icon: 'uil-book-open' },
  COURSE: { label: 'Curso', icon: 'uil-graduation-cap' },
};

export const CATEGORY_LIST = (
  Object.entries(CATEGORY_UI) as [
    CategoryCode,
    { label: string; icon: string }
  ][]
).map(([code, ui]) => ({ code, ...ui }));

export const statusEvent: Filter[] = [
  { code: 'EJECUCION', name: 'En ejecución' },
  { code: 'CANCELADO', name: 'Cancelado' },
  { code: 'APLAZADO', name: 'Aplazado' },
  { code: 'AGOTADO', name: 'Agotado' },
];

/* ===== Público (audience) ===== */

export type AudienceDTO = {
  allPublic: boolean;
  hasAgeRecommendation: boolean;
  hasRestriction: boolean;
  ages: {
    babies: boolean; // 0–3
    kids: boolean; // 4–11
    teens: boolean; // 12–17
    adults: boolean; // 18+
    seniors: boolean; // 65+
  };
  ageNote: string;
  restrictions: {
    partnersOnly: boolean;
    womenOnly: boolean;
    other: boolean;
    otherText: string;
  };
};

export interface WebsiteLink {
  url: string;
  title: string;
}
export interface VideoLink {
  url: string;
  title: string;
}
export interface SocialLink {
  network: SocialNetwork;
  url: string;
}

/* ===== Información útil ===== */

export type ParkingOption = 'FREE' | 'PAID' | 'NONE';
/** En formulario permites vacío (cuando se añade/quita la sección) */
export type ParkingValue = ParkingOption | '';

export interface FaqItem {
  q: string;
  a: string; // (máx. 300 chars en UI)
}

/* ===== Precios / Pases periódicos ===== */

export interface TicketPriceModel {
  type: string;
  price: number | null; // en el form permites null
}

export interface DayEventModel {
  id?: number;
  periodic_id?: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  time_start: string; // HH:mm[:ss] (puede venir vacío)
  time_end: string; // HH:mm[:ss] (puede venir vacío)
}

/* ===== Publicación ===== */

export interface PublicationInfo {
  published: boolean; // false = borrador
  publish_day: string | null; // YYYY-MM-DD (si null → publicar ahora)
  publish_time: string | null; // HH:mm (opcional)
}

/* ===== Modelo principal ===== */

export interface EventModel {
  // Identificación
  id: number;

  // Título / descripción
  title: string;
  description?: string;
  summary?: string; // resumen corto

  // Fechas y horas
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  time_start?: string; // HH:mm[:ss]
  time_end?: string; // HH:mm[:ss]

  // Clasificación
  category?: CategoryCode[] | [];
  audience?: AudienceDTO;

  // Ubicación
  online_link?: string;
  online_title?: string;
  province: string;
  town: string;
  place_id?: number | null;
  sala_id?: number | null;
  capacity?: number | null;

  // Imagen
  img?: string;

  // Estado
  status?: EnumStatusEvent;
  status_reason?: string;

  // Inscripción
  inscription?: boolean;
  inscription_method?: string;

  // Relaciones
  macroevent_id?: number | null;
  project_id?: number | null;

  // Acceso / entradas
  access: EventAccess;
  ticket_prices: TicketPriceModel[];
  tickets_method: string;

  // Periódico
  periodic: boolean;
  periodic_id: string;

  // Derivados
  isPast?: boolean;

  // ===== Información útil en raíz =====
  open_doors?: string | null; // HH:mm
  parking?: ParkingValue; // FREE | PAID | NONE | ''
  parking_info?: string;
  faqs?: FaqItem[];

  // ===== Comunicación en raíz =====
  websites?: WebsiteLink[];
  videos?: VideoLink[];
  socials?: SocialLink[];

  // ===== Publicación en raíz =====
  published: boolean;
  publish_day?: string | null;
  publish_time?: string | null;
}

/* ===== Modelo extendido con relaciones resueltas ===== */

export interface EventModelFullData extends EventModel {
  placeData?: PlaceModel;
  salaData?: SalaModel;

  organizer?: AgentAutocompleteModel[]; // entidades ya resueltas
  collaborator?: AgentAutocompleteModel[];
  sponsor?: AgentAutocompleteModel[];

  macroeventData?: MacroeventModel;
  projectData?: ProjectModel;

  periodicEvents?: DayEventModel[]; // pases del periodic_id
}
