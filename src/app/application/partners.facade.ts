import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { PartnersService } from 'src/app/core/services/partners.services';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({
  providedIn: 'root',
})
export class PartnersFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly partnersService = inject(PartnersService);
  private readonly generalService = inject(GeneralService);
  private readonly partnersSubject = new BehaviorSubject<PartnerModel[] | null>(
    null
  );
  private readonly filteredPartnersSubject = new BehaviorSubject<
    PartnerModel[] | null
  >(null);
  private readonly selectedPartnerSubject =
    new BehaviorSubject<PartnerModel | null>(null);

  partners$ = this.partnersSubject.asObservable();
  filteredPartners$ = this.filteredPartnersSubject.asObservable();
  selectedPartner$ = this.selectedPartnerSubject.asObservable();
  currentYear: number | null = null;
  currentFilter: number | null = null;

  constructor() {}

  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
  }

  private reloadCurrentFilteredYear(): void {
    if (this.currentFilter !== null) {
      this.loadPartnersByYear(this.currentFilter);
    } else {
      this.loadAllPartners();
    }
  }

  loadAllPartners(): void {
    this.partnersService
      .getPartners()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((partners: PartnerModel[]) => this.updatePartnerState(partners)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  setCurrentYear(year: number): void {
    this.currentYear = year;
  }

  loadPartnersByYear(year: number): void {
    this.setCurrentFilter(year);

    this.partnersService
      .getPartnersByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((partners: PartnerModel[]) => this.updatePartnerState(partners)),
        catchError((err) => this.generalService.handleHttpError(err))
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
        ),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  addPartner(partner: FormData): Observable<any> {
    return this.partnersService.add(partner).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilteredYear()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editPartner(itemId: number, partner: FormData): Observable<any> {
    return this.partnersService.edit(itemId, partner).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilteredYear()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deletePartner(id: number): void {
    this.partnersService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilteredYear()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedPartner(): void {
    this.selectedPartnerSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const allPartners = this.partnersSubject.getValue();

    if (!keyword.trim() || !allPartners) {
      this.filteredPartnersSubject.next(allPartners);
      return;
    }
    const search = keyword.trim().toLowerCase();
    const filteredPartners = allPartners.filter((partner) =>
      partner.name.toLowerCase().includes(search)
    );

    this.updatePartnerState(filteredPartners);
  }

  updatePartnerState(partners: PartnerModel[]): void {
    this.partnersSubject.next(partners);
    this.filteredPartnersSubject.next(partners); // Actualiza también los libros filtrados
  }
}
