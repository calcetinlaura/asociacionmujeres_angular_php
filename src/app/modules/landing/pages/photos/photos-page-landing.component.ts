import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { Filter, filterPhotos } from 'src/app/core/models/general.model';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';

@Component({
  selector: 'app-photos-page-landing',
  standalone: true,
  imports: [CommonModule, MatGridListModule, FiltersComponent],
  templateUrl: './photos-page-landing.component.html',
})
export class PhotosPageLandingComponent implements OnInit {
  photos: { url: string; text: string }[] = [];

  // Fuente de filtros (ya la tenías)
  filterGenderPhotos: Filter[] = filterPhotos;

  // Valor controlado por el padre para <app-filters>
  selectedFilter: string | number | null = 'CONCENTRACIONES';

  ngOnInit(): void {
    // Carga inicial
    this.filterSelected(String(this.selectedFilter ?? 'CONCENTRACIONES'));
  }

  filterSelected(filter: string): void {
    const loaders: Record<string, () => void> = {
      CONCENTRACIONES: () =>
        this.loadPhotos(
          'CONCENTRACIONES',
          30,
          'concentracion',
          'Imagen retrato concentraciones condena violencia de género'
        ),
      COCINA: () =>
        this.loadPhotos('COCINA', 148, 'cocina', 'Imagen retrato socia'),
      COSTURA: () => this.loadPhotos('COSTURA', 16, 'costura', 'Imagen taller'),
      BAILE: () => this.loadPhotos('BAILE', 17, 'baile', 'Imagen taller'),
      GANCHILLO: () =>
        this.loadPhotos('GANCHILLO', 19, 'ganchillo', 'Imagen taller'),
      GIMNASIA: () =>
        this.loadPhotos('GIMNASIA', 1, 'gimnasia', 'Imagen taller'),
      LECTURA: () => this.loadPhotos('LECTURA', 12, 'lectura', 'Imagen taller'),
      CHARLAS: () => this.loadPhotos('CHARLAS', 0, 'charla', 'Imagen taller'),
      PITERA: () =>
        this.loadPhotos('PITERA', 159, 'pitera', 'Imagen Fiesta Pitera'),
      RETRATOS: () =>
        this.loadPhotos('RETRATOS', 102, 'retrato', 'Imagen retrato socia'),
    };

    (loaders[filter] || loaders['CONCENTRACIONES'])();
  }

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

  splitPhotos<T>(photos: T[], columns: number): T[][] {
    const result: T[][] = Array.from({ length: columns }, () => []);
    photos.forEach((photo, index) => {
      result[index % columns].push(photo);
    });
    return result;
  }
}
