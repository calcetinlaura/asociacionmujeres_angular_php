import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, throwError } from 'rxjs';
import { Filter } from 'src/app/core/models/general.model';

@Injectable({
  providedIn: 'root',
})
export class GeneralService {
  currentYear = new Date().getFullYear();
  constructor(private snackBar: MatSnackBar) {}

  /**
   * Transforma una hora eliminando los segundos.
   */
  transformTime(value: any): { time: string } {
    let time = value.toString();
    time = time.slice(0, -3);
    return { time };
  }

  /** Genera una lista de años en orden descendente. */
  loadYears(currentYear: number, sinceYear: number): number[] {
    return Array.from(
      { length: currentYear - sinceYear + 1 },
      (_, i) => currentYear - i
    );
  }
  /** Genera una lista de filtros de año con etiqueta personalizada para el último año.*/
  getYearFilters(
    startYear: number,
    endYear: number,
    labelPrefix = ''
  ): Filter[] {
    const filters: Filter[] = [];

    for (let year = startYear; year <= endYear; year++) {
      filters.push({
        code: year,
        name:
          labelPrefix && year === endYear
            ? `${labelPrefix} ${year}`
            : year.toString(),
      });
    }
    // Invertir el array para que el último año esté primero
    return filters.reverse();
  }

  /**  Maneja la previsualización de imágenes. */
  handleFileSelection(
    file: File | null
  ): Promise<{ file: File | null; imageSrc: string }> {
    return new Promise((resolve) => {
      if (!file) return resolve({ file: null, imageSrc: '' });

      const reader = new FileReader();
      reader.onload = (e) =>
        resolve({ file, imageSrc: e.target?.result as string });
      reader.readAsDataURL(file);
    });
  }
  /**  Validar y extraer PDFs */
  validateAndExtractPdf(event: Event): File | null {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      console.warn('⚠️ No se seleccionó ningún archivo.');
      return null;
    }

    if (file.type !== 'application/pdf') {
      console.warn('⚠️ Formato incorrecto. Selecciona un archivo PDF.');
      return null;
    }

    return file;
  }
  clearSearchInput(inputComponent?: { clearInput: () => void }): void {
    inputComponent?.clearInput();
  }

  /** Construye un FormData dinámico a partir de un objeto   */
  createFormData(
    item: any,
    fileFields: { [key: string]: File | null } = {},
    itemId?: number
  ): FormData {
    const formData = new FormData();

    Object.keys(item).forEach((key) => {
      const value = item[key];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value) || typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      } else {
        formData.append(key, '');
      }
    });

    // Manejo flexible de múltiples archivos
    Object.keys(fileFields).forEach((field) => {
      const file = fileFields[field];
      if (file instanceof File) {
        formData.append(field, file, file.name);
      } else if (item.existingUrl) {
        formData.append('existingUrl', item.existingUrl);
      } else {
        // Marcar para borrar
        formData.append(field, '');
      }
    });

    if (itemId && itemId !== 0) {
      formData.append('_method', 'PATCH');
      formData.append('id', itemId.toString());
    }

    return formData;
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  handleHttpError(error: any): Observable<never> {
    let errorMessage = 'Ha ocurrido un error desconocido.';

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Error ${error.status}: ${error.statusText}`;
      }
    }

    console.error('Error capturado:', error);
    return throwError(() => new Error(errorMessage));
  }

  enableInputControls(form: FormGroup, controls: string[]) {
    controls.forEach((name) => form.controls[name]?.enable());
  }

  disableInputControls(form: FormGroup, controls: string[]) {
    controls.forEach((name) => form.controls[name]?.disable());
  }
  getYearFromDate(dateString: string | Date): number {
    return new Date(dateString).getFullYear();
  }
}
