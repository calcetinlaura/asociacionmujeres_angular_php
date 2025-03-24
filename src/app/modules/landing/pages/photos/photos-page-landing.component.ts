import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { FiltersComponent } from '../../components/filters/filters.component';
import { filterPhotos } from 'src/app/core/models/general.model';

@Component({
  selector: 'app-photos-page-landing',
  standalone: true,
  imports: [CommonModule, MatGridListModule, FiltersComponent],
  templateUrl: './photos-page-landing.component.html',
  providers: [],
})
export class PhotosPageLandingComponent implements OnInit {
  photos: { url: string; text: string }[] = [];
  filterGenderPhotos = filterPhotos;

  ngOnInit(): void {
    this.loadConcentracionesPhotos();
  }
  filterSelected(filter: string): void {
    // this.selectedFilter = filter;
    switch (filter) {
      case 'CONCENTRACIONES':
        this.loadConcentracionesPhotos();
        break;
      case 'COCINA':
        this.loadCocinaPhotos();
        break;
      case 'COSTURA':
        this.loadCosturaPhotos();
        break;
      case 'BAILE':
        this.loadBailePhotos();
        break;
      case 'GANCHILLO':
        this.loadGanchilloPhotos();
        break;
      case 'GIMNASIA':
        this.loadGimnasiaPhotos();
        break;
      case 'LECTURA':
        this.loadLecturaPhotos();
        break;
      case 'CHARLAS':
        this.loadCharlasPhotos();
        break;
      case 'PITERA':
        this.loadPiteraPhotos();
        break;
      case 'RETRATOS':
        this.loadRetratosPhotos();
        break;
      default:
        this.loadConcentracionesPhotos();
        break;
    }
  }

  loadPiteraPhotos(): void {
    this.photos = Array.from({ length: 159 }, (_, i) => ({
      url: `assets/img/GALERIA/PITERA/pitera_${(i + 1)
        .toString()
        .padStart(2, '0')}.jpg`,
      text: `Imagen Fiesta Pitera ${i + 1}`,
    }));
  }
  loadRetratosPhotos(): void {
    this.photos = Array.from({ length: 102 }, (_, i) => ({
      url: `assets/img/GALERIA/RETRATOS/retrato_${(i + 1)
        .toString()
        .padStart(2, '0')}.jpg`,
      text: `Imagen retrato socia ${i + 1}`,
    }));
  }
  loadCocinaPhotos(): void {
    this.photos = Array.from({ length: 148 }, (_, i) => ({
      url: `assets/img/GALERIA/COCINA/cocina_${(i + 1)
        .toString()
        .padStart(2, '0')}.jpg`,
      text: `Imagen retrato socia ${i + 1}`,
    }));
  }
  loadConcentracionesPhotos(): void {
    this.photos = Array.from({ length: 30 }, (_, i) => ({
      url: `assets/img/GALERIA/CONCENTRACIONES/concentracion_${(i + 1)
        .toString()
        .padStart(2, '0')}.jpg`,
      text: `Imagen retrato concentraciones condena violencia de género ${
        i + 1
      }`,
    }));
  }
  loadCharlasPhotos(): void {
    this.photos = Array.from({ length: 0 }, (_, i) => ({
      url: `assets/img/GALERIA/CHARLAS/charla_${(i + 1)
        .toString()
        .padStart(2, '0')}.jpg`,
      text: `Imagen taller ${i + 1}`,
    }));
  }
  loadCosturaPhotos(): void {
    this.photos = Array.from({ length: 16 }, (_, i) => ({
      url: `assets/img/GALERIA/COSTURA/costura_${(i + 1)
        .toString()
        .padStart(2, '0')}.jpg`,
      text: `Imagen taller ${i + 1}`,
    }));
  }
  loadGanchilloPhotos(): void {
    this.photos = Array.from({ length: 19 }, (_, i) => ({
      url: `assets/img/GALERIA/GANCHILLO/ganchillo_${(i + 1)
        .toString()
        .padStart(2, '0')}.jpg`,
      text: `Imagen taller ${i + 1}`,
    }));
  }
  loadLecturaPhotos(): void {
    this.photos = Array.from({ length: 12 }, (_, i) => ({
      url: `assets/img/GALERIA/LECTURA/lectura_${(i + 1)
        .toString()
        .padStart(2, '0')}.jpg`,
      text: `Imagen taller ${i + 1}`,
    }));
  }
  loadGimnasiaPhotos(): void {
    this.photos = Array.from({ length: 1 }, (_, i) => ({
      url: `assets/img/GALERIA/GIMNASIA/gimnasia_${(i + 1)
        .toString()
        .padStart(2, '0')}.jpg`,
      text: `Imagen taller ${i + 1}`,
    }));
  }
  loadBailePhotos(): void {
    this.photos = Array.from({ length: 17 }, (_, i) => ({
      url: `assets/img/GALERIA/BAILE/baile_${(i + 1)
        .toString()
        .padStart(2, '0')}.jpg`,
      text: `Imagen taller ${i + 1}`,
    }));
  }

  splitPhotos(photos: any[], columns: number): any[][] {
    const result: any[][] = Array.from({ length: columns }, () => []);
    photos.forEach((photo, index) => {
      result[index % columns].push(photo);
    });

    return result;
  }
}
