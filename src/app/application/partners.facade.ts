import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { PartnersService } from 'src/app/core/services/partners.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class PartnersFacade extends LoadableFacade {
  private readonly partnersService = inject(PartnersService);

  // State propio
  private readonly partnersSubject = new BehaviorSubject<PartnerModel[] | null>(
    null
  );
  private readonly filteredPartnersSubject = new BehaviorSubject<
    PartnerModel[] | null
  >(null);
  private readonly selectedPartnerSubject =
    new BehaviorSubject<PartnerModel | null>(null);

  // Streams públicos
  readonly partners$ = this.partnersSubject.asObservable();
  readonly filteredPartners$ = this.filteredPartnersSubject.asObservable();
  readonly selectedPartner$ = this.selectedPartnerSubject.asObservable();

  private currentFilter: number | null = null;

  loadAllPartners(): void {
    this.setCurrentFilter(null);
    this.executeWithLoading(this.partnersService.getPartners(), (partners) =>
      this.updatePartnerState(partners)
    );
  }

  loadPartnersByYear(year: number): void {
    this.setCurrentFilter(year);
    this.executeWithLoading(
      this.partnersService.getPartnersByYear(year),
      (partners) => this.updatePartnerState(partners)
    );
  }

  loadPartnerById(id: number): void {
    this.executeWithLoading(
      this.partnersService.getPartnerById(id),
      (partner) => this.selectedPartnerSubject.next(partner)
    );
  }

  addPartner(partner: FormData): Observable<any> {
    return this.wrapWithLoading(this.partnersService.add(partner)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editPartner(id: number, partner: FormData): Observable<any> {
    return this.wrapWithLoading(this.partnersService.edit(partner)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deletePartner(id: number): void {
    this.executeWithLoading(this.partnersService.delete(id), () =>
      this.reloadCurrentFilter()
    );
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
