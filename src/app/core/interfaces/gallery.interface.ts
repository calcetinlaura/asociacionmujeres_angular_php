import { Filter } from './general.interface';

/**
 * Conjunto de códigos disponibles, sin strings sueltas.
 * Usamos "as const" para obtener tipos literales a partir de los valores.
 */
export const GalleryCode = {
  CONCENTRACIONES: 'CONCENTRACIONES',
  COCINA: 'COCINA',
  COSTURA: 'COSTURA',
  BAILE: 'BAILE',
  GANCHILLO: 'GANCHILLO',
  GIMNASIA: 'GIMNASIA',
  LECTURA: 'LECTURA',
  CHARLAS: 'CHARLAS',
  PITERA: 'PITERA',
  RETRATOS: 'RETRATOS',
} as const;

/** Tipo fuerte derivado de los valores de GalleryCode */
export type GalleryFilterCode = (typeof GalleryCode)[keyof typeof GalleryCode];

/** Lista de filtros de la galería (sin "Todas") */
export const filterGallery: Filter[] = [
  { code: GalleryCode.CONCENTRACIONES, name: 'Concentraciones' },
  { code: GalleryCode.COCINA, name: 'Cocina' },
  { code: GalleryCode.COSTURA, name: 'Costura' },
  { code: GalleryCode.BAILE, name: 'Baile' },
  { code: GalleryCode.GANCHILLO, name: 'Ganchillo' },
  { code: GalleryCode.GIMNASIA, name: 'Gimnasia' },
  { code: GalleryCode.LECTURA, name: 'Lectura' },
  { code: GalleryCode.CHARLAS, name: 'Charlas' },
  { code: GalleryCode.PITERA, name: 'Pitera' },
  { code: GalleryCode.RETRATOS, name: 'Retratos' },
];
