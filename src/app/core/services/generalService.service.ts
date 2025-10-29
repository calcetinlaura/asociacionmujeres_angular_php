import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { catchError, Observable, throwError } from 'rxjs';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { Filter } from 'src/app/core/interfaces/general.interface';

@Injectable({
  providedIn: 'root',
})
export class GeneralService {
  currentYear = new Date().getFullYear();
  constructor(private http: HttpClient) {}

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
  clearSearchInput(inputComponent?: unknown): void {
    const fn = (inputComponent as any)?.clearInput;
    if (typeof fn === 'function') fn.call(inputComponent);
  }

  /** Construye un FormData dinámico a partir de un objeto   */
  createFormData(
    item: any,
    fileFields: { [key: string]: File | string | null } = {},
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
      } else if (typeof file === 'string' && file !== '') {
        // URL existente (por ejemplo, al editar sin cambiar el archivo)
        formData.append(field, file);
      } else {
        // Nada seleccionado: marcar para eliminar
        formData.append(field, '');
      }
    });

    if (itemId && itemId !== 0) {
      formData.append('_method', 'PATCH');
      formData.append('id', itemId.toString());
    }

    return formData;
  }
  // POST con override DELETE: envía params en el body (FormData)
  deleteOverride<T>(
    url: string,
    params?: Record<string, string | number | boolean>,
    extra?: { headers?: HttpHeaders }
  ): Observable<T> {
    const body = new FormData();
    body.append('_method', 'DELETE');
    if (params) {
      for (const [k, v] of Object.entries(params)) body.append(k, String(v));
    }
    return this.http
      .post<T>(url, body, extra)
      .pipe(catchError((err) => this.handleHttpError(err)));
  }

  // (Opcional) intento DELETE real y, si 405/403, fallback al override:
  tryDeleteWithFallback<T>(
    url: string,
    queryParams?: Record<string, string | number | boolean>,
    extra?: { headers?: HttpHeaders }
  ): Observable<T> {
    // Construir HttpParams rápido
    const searchParams = new URLSearchParams();
    if (queryParams) {
      for (const [k, v] of Object.entries(queryParams))
        searchParams.set(k, String(v));
    }
    const fullUrl = searchParams.toString() ? `${url}?${searchParams}` : url;

    return this.http.delete<T>(fullUrl, extra).pipe(
      catchError((err) => {
        if (err?.status === 405 || err?.status === 403) {
          // Fallback a POST + _method=DELETE
          return this.deleteOverride<T>(url, queryParams, extra);
        }
        return this.handleHttpError(err);
      })
    );
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
  convertFormDataToObject<T = any>(formData: FormData): T {
    const obj: any = {};
    formData.forEach((value, key) => {
      obj[key] = value;
    });
    return obj as T;
  }
  // Establece la visibilidad de las columnas
  setColumnVisibility(
    headerList: ColumnModel[],
    columnsToHide: string[]
  ): Record<string, boolean> {
    // Inicia columnVisibility con todas las columnas visibles
    return headerList.reduce((acc, col) => {
      // Marca las columnas a ocultar como false, las demás como true
      acc[col.key] = !columnsToHide.includes(col.key);
      return acc;
    }, {} as Record<string, boolean>);
  }

  // Actualiza las columnas visibles según la visibilidad configurada
  updateDisplayedColumns(
    headerList: ColumnModel[],
    columnVisibility: Record<string, boolean>
  ): string[] {
    // Filtra las columnas que están visibles y devuelve las claves correspondientes
    const dynamic = headerList
      .filter((col) => columnVisibility[col.key]) // Filtra solo las columnas visibles
      .map((col) => col.key); // Extrae las claves de las columnas visibles

    return [...dynamic, 'actions']; // Asegúrate de agregar la columna 'actions' si la necesitas
  }
  // Toggle de visibilidad de columnas (ahora en el servicio)
  toggleColumn(
    key: string,
    columnVisibility: Record<string, boolean>,
    headerList: ColumnModel[]
  ): string[] {
    // Cambiar la visibilidad de la columna
    columnVisibility[key] = !columnVisibility[key];

    // Actualiza las columnas visibles después del toggle
    return this.updateDisplayedColumns(headerList, columnVisibility);
  }
  //quillModules textarea para edición
  readonly baseQuillModules: Record<string, any> = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      ['image', 'code-block'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link', 'clean'],
      [{ indent: '-1' }, { indent: '+1' }],
    ],
  };

  get defaultQuillModules(): Record<string, any> {
    // devuelve una copia para evitar mutaciones accidentales
    return JSON.parse(JSON.stringify(this.baseQuillModules));
  }

  /** Permite añadir o quitar herramientas por componente */
  buildQuillModules(
    override: Partial<Record<string, any>> = {}
  ): Record<string, any> {
    return { ...this.defaultQuillModules, ...override };
  }
  toggleInputControls(
    form: FormGroup,
    controls: string[],
    enable: unknown
  ): void {
    const on = !!enable;
    controls.forEach((name) => {
      const control = form.get(name);
      if (!control) return;
      on
        ? control.enable({ emitEvent: false })
        : control.disable({ emitEvent: false });
    });
  }
}
