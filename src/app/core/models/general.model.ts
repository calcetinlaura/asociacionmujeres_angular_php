import { Filter } from '../interfaces/general.interface';

export enum TypeList {
  Events = 'EVENTS',
  Books = 'BOOKS',
  Movies = 'MOVIES',
  Recipes = 'RECIPES',
  Piteras = 'PITERAS',
  Partners = 'PARTNERS',
  Invoices = 'INVOICES',
  Creditors = 'CREDITORS',
  Agents = 'AGENTS',
  Subsidies = 'SUBSIDIES',
  Places = 'PLACES',
  Macroevents = 'MACROEVENTS',
  Projects = 'PROJECTS',
  Podcasts = 'PODCASTS',
  Articles = 'ARTICLES',
  MultiEvents = 'MULTIEVENTS',
  EventsReports = 'EVENTSREPORTS',
}

export enum TypeActionModal {
  Edit = 'EDIT',
  Delete = 'DELETE',
  Show = 'SHOW',
  Create = 'CREATE',
  Duplicate = 'DUPLICATE',
}

export const filterPhotos: Filter[] = [
  { code: 'CONCENTRACIONES', name: 'Concentraciones violencia de género' },
  { code: 'COCINA', name: 'Jornadas de cocina' },
  { code: 'PITERA', name: 'Presentación revista La Pitera (2025)' },
  { code: 'COSTURA', name: 'Taller de costura' },
  { code: 'LECTURA', name: 'Club de lectura' },
  { code: 'GANCHILLO', name: 'Taller de ganchillo' },
  { code: 'GIMNASIA', name: 'Gimnasia funcional' },
  { code: 'BAILE', name: 'Baile' },
  { code: 'RETRATOS', name: 'Socias' },
  { code: 'CHARLAS', name: 'Charlas' },
];
