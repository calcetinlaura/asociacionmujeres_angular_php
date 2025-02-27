import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { PartnersService } from '../core/services/partners.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PartnerModel } from '../core/interfaces/partner.interface';

@Injectable({
  providedIn: 'root',
})
export class PartnersFacade {
  private destroyRef = inject(DestroyRef);

  // Subjects to manage the state of partners and current selected partner
  private partnersSubject = new BehaviorSubject<PartnerModel[] | null>(null);
  private selectedPartnerSubject = new BehaviorSubject<PartnerModel | null>(
    null
  );

  partners$ = this.partnersSubject.asObservable();
  selectedPartner$ = this.selectedPartnerSubject.asObservable();

  constructor(private partnersService: PartnersService) {}

  // Load all partners
  loadAllPartners(): void {
    this.partnersService
      .getAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((partners: PartnerModel[]) => this.partnersSubject.next(partners))
      )
      .subscribe();
  }

  loadPartnersByYear(year: number): void {
    this.partnersService
      .getAllByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((partner: PartnerModel[]) => this.partnersSubject.next(partner))
      )
      .subscribe();
  }

  // Load a specific partner by ID
  loadPartnerById(id: number): void {
    this.partnersService
      .getById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((partner: PartnerModel) =>
          this.selectedPartnerSubject.next(partner)
        )
      )
      .subscribe();
  }

  // Add a new partner
  addPartner(partner: PartnerModel): Observable<PartnerModel> {
    return this.partnersService.add(partner).pipe(
      tap(() => this.loadAllPartners()) // Reload partners after adding
    );
  }

  // Edit a partner
  editPartner(itemId: number, partner: PartnerModel): void {
    this.partnersService
      .edit(itemId, partner)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllPartners())
      )
      .subscribe();
  }

  // Delete a partner
  deletePartner(id: number): void {
    this.partnersService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllPartners())
      )
      .subscribe();
  }

  // Clear selected partner
  clearSelectedPartner(): void {
    this.selectedPartnerSubject.next(null);
  }
}
