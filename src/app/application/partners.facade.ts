import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { PartnersService } from 'src/app/core/services/partners.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class PartnersFacade extends LoadableFacade {
  private readonly partnersService = inject(PartnersService);

  // Estado
  private readonly partnersSubject = new BehaviorSubject<PartnerModel[] | null>(
    null
  );
  private readonly filteredPartnersSubject = new BehaviorSubject<
    PartnerModel[] | null
  >(null);
  private readonly selectedPartnerSubject =
    new BehaviorSubject<PartnerModel | null>(null);

  // NEW: loaders separados
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // Streams públicos
  readonly partners$ = this.partnersSubject.asObservable();
  readonly filteredPartners$ = this.filteredPartnersSubject.asObservable();
  readonly selectedPartner$ = this.selectedPartnerSubject.asObservable();

  // NEW: usa estos en la UI
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: number | null = null;

  // ─────────── LISTA → isLoadingList$
  loadAllPartners(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);
    this.partnersService
      .getPartners()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((partners) => this.updatePartnerState(partners));
  }

  loadPartnersByYear(year: number): void {
    this.setCurrentFilter(year);
    this.listLoadingSubject.next(true);
    this.partnersService
      .getPartnersByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((partners) => this.updatePartnerState(partners));
  }

  // ─────────── ITEM → isLoadingItem$
  loadPartnerById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.partnersService
      .getPartnerById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe((partner) => this.selectedPartnerSubject.next(partner));
  }

  addPartner(partner: FormData): Observable<any> {
    this.itemLoadingSubject.next(true);
    return this.partnersService.add(partner).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  // Nota: si tu service necesita el id en la edición, pásalo ahí.
  editPartner(id: number, partner: FormData): Observable<any> {
    this.itemLoadingSubject.next(true);
    return this.partnersService.edit(partner).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deletePartner(id: number): void {
    this.itemLoadingSubject.next(true);
    this.partnersService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe(() => this.reloadCurrentFilter());
  }

  clearSelectedPartner(): void {
    this.selectedPartnerSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.partnersSubject.getValue();
    if (!all) {
      this.filteredPartnersSubject.next(all);
      return;
    }
    if (!toSearchKey(keyword)) {
      this.filteredPartnersSubject.next(all);
      return;
    }

    const filtered = all.filter((partner) =>
      [partner.name].some((field) => includesNormalized(field, keyword))
    );
    this.filteredPartnersSubject.next(filtered);
  }

  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllPartners();
      return;
    }
    this.loadPartnersByYear(this.currentFilter);
  }

  private updatePartnerState(partners: PartnerModel[]): void {
    this.partnersSubject.next(partners);
    this.filteredPartnersSubject.next(partners);
  }
}
