import { Injectable } from '@angular/core';
import { Filter } from 'src/app/core/models/general.model';

@Injectable({
  providedIn: 'root',
})
export class GeneralService {
  currentYear = new Date().getFullYear();

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

  clearSearchInput(inputComponent?: { clearInput: () => void }): void {
    inputComponent?.clearInput();
  }

  /** Construye un FormData dinámico a partir de un objeto   */
  createFormData(
    item: any,
    selectedImageFile: File | null,
    itemId?: number
  ): FormData {
    const formData = new FormData();

    Object.keys(item).forEach((key) => {
      if (item[key] !== null && item[key] !== undefined) {
        formData.append(key, item[key].toString());
      }
    });

    if (selectedImageFile) {
      formData.append('img', selectedImageFile, selectedImageFile.name);
    }

    if (itemId) {
      formData.append('_method', 'PATCH');
      formData.append('id', itemId.toString());
    }

    return formData;
  }
}
