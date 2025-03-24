import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { PartnersService } from '../core/services/partners.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PartnerModel } from '../core/interfaces/partner.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PartnersFacade {
  private destroyRef = inject(DestroyRef);
  private partnersService = inject(PartnersService);
  private partnersSubject = new BehaviorSubject<PartnerModel[] | null>(null);
  private selectedPartnerSubject = new BehaviorSubject<PartnerModel | null>(
    null
  );
  partners$ = this.partnersSubject.asObservable();
  selectedPartner$ = this.selectedPartnerSubject.asObservable();

  constructor() {}

  loadAllPartners(): void {
    this.partnersService
      .getPartners()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((partners: PartnerModel[]) => this.updatePartnerState(partners)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadPartnersByYear(year: number): void {
    this.partnersService
      .getPartnersByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((partner: PartnerModel[]) => this.partnersSubject.next(partner))
      )
      .subscribe();
  }

  loadPartnerById(id: number): void {
    this.partnersService
      .getPartnerById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((partner: PartnerModel) =>
          this.selectedPartnerSubject.next(partner)
        )
      )
      .subscribe();
  }

  addPartner(partner: FormData): Observable<any> {
    return this.partnersService.add(partner).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPartners()),
      catchError(this.handleError)
    );
  }

  editPartner(itemId: number, partner: FormData): Observable<any> {
    return this.partnersService.edit(itemId, partner).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPartners()),
      catchError(this.handleError)
    );
  }

  deletePartner(id: number): void {
    this.partnersService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllPartners()),
        catchError(this.handleError)
      )
      .subscribe();
  }

  clearSelectedPartner(): void {
    this.selectedPartnerSubject.next(null);
  }
  updatePartnerState(partners: PartnerModel[]): void {
    this.partnersSubject.next(partners);
  }

  // Método para manejar errores
  handleError(error: HttpErrorResponse) {
    let errorMessage = '';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente o red
      errorMessage = `Error del cliente o red: ${error.error.message}`;
    } else {
      // El backend retornó un código de error no exitoso
      errorMessage = `Código de error del servidor: ${error.status}\nMensaje: ${error.message}`;
    }

    console.error(errorMessage); // Para depuración

    // Aquí podrías devolver un mensaje amigable para el usuario, o simplemente retornar el error
    return throwError(
      () =>
        new Error(
          'Hubo un problema con la solicitud, inténtelo de nuevo más tarde.'
        )
    );
  }
}
