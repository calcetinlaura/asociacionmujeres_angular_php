import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { TypeList } from 'src/app/core/models/general.model';

@Component({
  selector: 'app-image-control',
  standalone: true,
  templateUrl: './image-control.component.html',
  styleUrls: ['./image-control.component.css'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
})
export class ImageControlComponent implements OnInit {
  selectedFile: File | null = null;
  uploading = signal(false);
  @Input() previewImg: string | null = null;
  @Input() type: TypeList | null = null;
  @Output() imgSelected = new EventEmitter<File>();
  imageWidthValue: number = 200;
  imageHeightValue: number = 150;
  previewUrl: string = '';

  private basePath = 'assets/img';
  private placeholder = 'assets/img/error.jpg';
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    console.log('Componente inicializado');
    this.setPreviewUrl();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['previewImg'] || changes['type']) {
      this.setPreviewUrl();
    }
  }

  private setPreviewUrl() {
    this.previewUrl = this.previewImg
      ? `${this.basePath}/${this.type}/${this.previewImg}`
      : this.placeholder; // Si no hay imagen, usa el placeholder
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

  // Cuando el usuario selecciona un archivo
  // imgSelected(event: any) {
  //   const img: File = event.target.imgs[0];
  //   this.selectedFile = img;

  //   // Usar FileReader para previsualizar la imagen
  //   const reader = new FileReader();
  //   reader.onload = (e) => {
  //     this.previewUrl = e.target?.result as string;
  //   };
  //   reader.readAsDataURL(img);
  // }

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
  // Método para manejar la subida de la imagen
  async onSubmit() {
    if (this.selectedFile) {
      this.uploading.set(true); // Cambiar el estado de carga
      const formData = new FormData();
      formData.append('img', this.selectedFile);

      try {
        console.log('DATOS FORMULARIO', formData);
        // Cambiar la URL a la de tu API para subir la imagen
        const response = await this.http
          .post('http://localhost/ASOC/api/books.php/upload', formData)
          .toPromise();
        console.log('Upload successful:', response);
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        this.uploading.set(false); // Resetear el estado de carga
      }
    }
  }
}
