import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TypeList } from 'src/app/core/models/general.model';
import { environments } from 'src/environments/environments';

@Component({
    selector: 'app-image-control',
    templateUrl: './image-control.component.html',
    styleUrls: ['./image-control.component.css'],
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatProgressSpinnerModule,
    ]
})
export class ImageControlComponent implements OnInit {
  selectedFile: File | null = null;
  uploading = signal(false);
  @Input() previewImg: string | null = null;
  @Input() type: TypeList | null = null;
  @Output() imgSelected = new EventEmitter<File>();
  @Input() imageWidthValue: number | string | null = 200;
  @Input() entityId: number | null = null;
  private apiUrl: string = `${environments.api}/backend`;
  imageHeightValue: number = 150;
  previewUrl: string = '';

  basePath = '/uploads/img';
  placeholder = 'assets/img/error.jpg';
  placeholderPartner = 'assets/img/mujer.jpg';
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.setPreviewUrl();

    // Si la imagen debe ocupar el ancho máximo, usa null para manejarlo en CSS
    if (this.imageWidthValue === 'full') {
      this.imageWidthValue = null;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['previewImg'] || changes['type']) {
      this.setPreviewUrl();
    }
  }

  private setPreviewUrl() {
    if (this.previewImg) {
      console.log(this.previewImg, 'foto que carga');
      // Si el tipo es 'event', extraer el año del nombre del archivo
      let yearFolder = '';
      if (this.type === TypeList.Events || this.type === TypeList.Macroevents) {
        const match = this.previewImg.match(/^(\d{4})_/);
        yearFolder = match ? match[1] : '';
      }

      // Construir la URL correctamente
      this.previewUrl = yearFolder
        ? `${this.basePath}/${this.type}/${yearFolder}/${this.previewImg}`
        : `${this.basePath}/${this.type}/${this.previewImg}`;
    } else {
      if (this.type !== 'PARTNERS') {
        this.previewUrl = this.placeholder; // Si no hay imagen, usa el placeholder
      } else {
        this.previewUrl = this.placeholderPartner;
      }
    }
  }

  imageWidth() {
    return this.imageWidthValue;
  }

  // Método para obtener el alto de la imagen
  imageHeight() {
    return this.imageHeightValue;
  }
  imageSource() {
    return this.previewUrl;
  }

  imageSelected(event: Event) {
    const imgInput = event.target as HTMLInputElement;
    if (imgInput.files && imgInput.files.length > 0) {
      const img: File = imgInput.files[0];
      this.selectedFile = img;

      // Usar FileReader para previsualizar la imagen
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(img);

      // Emitir el archivo seleccionado
      this.imgSelected.emit(img);
    }
  }

  async onSubmit() {
    if (this.selectedFile) {
      this.uploading.set(true);
      const formData = new FormData();
      formData.append('img', this.selectedFile);
      formData.append('type', this.type?.toString() ?? 'GENERAL');

      try {
        const response = await this.http.post(this.getEndpointUrl(), formData);
        console.log('Imagen subida:', response);
      } catch (error) {
        console.error('Error al subir imagen:', error);
      } finally {
        this.uploading.set(false);
      }
    }
  }

  removeImage() {
    const hasUploadedImage =
      this.previewImg &&
      this.previewImg !== this.placeholder &&
      this.previewImg !== this.placeholderPartner;

    // Solo hacer llamada al backend si hay imagen subida Y hay ID
    if (hasUploadedImage && this.entityId) {
      const formData = new FormData();
      formData.append('action', 'deleteImage');
      formData.append('id', this.entityId.toString());
      formData.append('type', this.type?.toString() ?? 'GENERAL');

      this.http.post(this.getEndpointUrl(), formData).subscribe({
        next: () => {
          console.log('Imagen eliminada del servidor');
          this.resetImagePreview();
        },
        error: (err) => {
          console.error('Error al eliminar imagen del servidor:', err);
          this.resetImagePreview();
        },
      });
    } else {
      // Si no hay ID, solo quitamos la previsualización del frontend
      this.resetImagePreview();
    }
  }

  private resetImagePreview() {
    this.selectedFile = null;
    this.previewImg = null; // ¡Muy importante!
    this.previewUrl =
      this.type !== 'PARTNERS' ? this.placeholder : this.placeholderPartner;
    this.imgSelected.emit(null as any);
  }
  private getEndpointUrl(): string {
    return `${this.apiUrl}/${this.type?.toString().toLowerCase()}.php`;
  }
}
