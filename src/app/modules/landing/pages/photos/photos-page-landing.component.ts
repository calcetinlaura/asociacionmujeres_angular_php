import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { FiltersFacade } from 'src/app/application/filters.facade';
import {
  GalleryCode,
  GalleryFilterCode,
} from 'src/app/core/interfaces/gallery.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';

@Component({
  selector: 'app-photos-page-landing',
  standalone: true,
  imports: [CommonModule, MatGridListModule, FiltersComponent],
  templateUrl: './photos-page-landing.component.html',
})
export class PhotosPageLandingComponent implements OnInit {
  readonly filtersFacade = inject(FiltersFacade);

  photos: { url: string; text: string }[] = [];

  ngOnInit(): void {
    // Carga filtros de galería y selecciona código tipado. Retrasa la ejecución un ciclo de detección de cambios:
    this.filtersFacade.loadFiltersFor(TypeList.Gallery);
  }
  ngAfterViewInit(): void {
    // lo llamamos cuando el input ya existe
    setTimeout(() => {
      this.filterSelected(GalleryCode.CONCENTRACIONES);
    });
  }
  /**
   * Convierte una entrada arbitraria (string/number) a GalleryFilterCode
   * Devuelve null si no es un código válido (por si el output del componente emite string suelto)
   */
  private toGalleryCode(v: unknown): GalleryFilterCode | null {
    const val = String(v) as GalleryFilterCode;
    return (Object.values(GalleryCode) as string[]).includes(val) ? val : null;
  }

  /**
   * Maneja el cambio de filtro. No hay "Todas", solo códigos válidos.
   */
  filterSelected(input: unknown): void {
    const code = this.toGalleryCode(input);
    if (!code) return; // ignora valores no válidos

    // sincroniza selección para que el botón quede activo
    this.filtersFacade.selectFilter(code);

    const loaders: Record<GalleryFilterCode, () => void> = {
      [GalleryCode.CONCENTRACIONES]: () =>
        this.loadPhotos(
          GalleryCode.CONCENTRACIONES,
          30,
          'concentracion',
          'Imagen retrato concentraciones condena violencia de género'
        ),
      [GalleryCode.COCINA]: () =>
        this.loadPhotos(
          GalleryCode.COCINA,
          148,
          'cocina',
          'Imagen retrato socia'
        ),
      [GalleryCode.COSTURA]: () =>
        this.loadPhotos(GalleryCode.COSTURA, 16, 'costura', 'Imagen taller'),
      [GalleryCode.BAILE]: () =>
        this.loadPhotos(GalleryCode.BAILE, 17, 'baile', 'Imagen taller'),
      [GalleryCode.GANCHILLO]: () =>
        this.loadPhotos(
          GalleryCode.GANCHILLO,
          19,
          'ganchillo',
          'Imagen taller'
        ),
      [GalleryCode.GIMNASIA]: () =>
        this.loadPhotos(GalleryCode.GIMNASIA, 1, 'gimnasia', 'Imagen taller'),
      [GalleryCode.LECTURA]: () =>
        this.loadPhotos(GalleryCode.LECTURA, 12, 'lectura', 'Imagen taller'),
      [GalleryCode.CHARLAS]: () =>
        this.loadPhotos(GalleryCode.CHARLAS, 0, 'charla', 'Imagen taller'),
      [GalleryCode.PITERA]: () =>
        this.loadPhotos(
          GalleryCode.PITERA,
          159,
          'pitera',
          'Imagen Fiesta Pitera'
        ),
      [GalleryCode.RETRATOS]: () =>
        this.loadPhotos(
          GalleryCode.RETRATOS,
          102,
          'retrato',
          'Imagen retrato socia'
        ),
    };

    loaders[code](); // ejecuta el loader del código seleccionado
  }

  /**
   * Carga un conjunto de fotos de una carpeta concreta
   */
  private loadPhotos(
    folder: string,
    count: number,
    baseName: string,
    label: string
  ): void {
    this.photos = Array.from({ length: count }, (_, i) => ({
      url: `assets/img/GALERIA/${folder}/${baseName}_${(i + 1)
        .toString()
        .padStart(2, '0')}.jpg`,
      text: `${label} ${i + 1}`,
    }));
  }

  /**
   * Divide el array de fotos en columnas para el grid
   */
  splitPhotos<T>(photos: T[], columns: number): T[][] {
    const result: T[][] = Array.from({ length: columns }, () => []);
    photos.forEach((photo, index) => {
      result[index % columns].push(photo);
    });
    return result;
  }
}
