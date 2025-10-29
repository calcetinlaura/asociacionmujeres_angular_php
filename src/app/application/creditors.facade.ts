import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, EMPTY, Observable } from 'rxjs';
import { catchError, finalize, map, startWith, tap } from 'rxjs/operators';
import { CreditorWithInvoices } from 'src/app/core/interfaces/creditor.interface';
import { CreditorsService } from 'src/app/core/services/creditors.services';
import { filterByKeyword } from '../shared/utils/facade.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class CreditorsFacade extends LoadableFacade {
  private readonly creditorsService = inject(CreditorsService);

  // ───────── STATE ─────────
  private readonly creditorsSubject = new BehaviorSubject<
    CreditorWithInvoices[]
  >([]);
  private readonly filteredCreditorsSubject = new BehaviorSubject<
    CreditorWithInvoices[]
  >([]);
  private readonly selectedCreditorSubject =
    new BehaviorSubject<CreditorWithInvoices | null>(null);
  private readonly keywordSubject = new BehaviorSubject<string>('');

  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  private currentFilter: string | null = null;

  // ───────── PUBLIC STREAMS ─────────
  readonly creditors$ = this.creditorsSubject.asObservable();
  readonly keyword$ = this.keywordSubject.asObservable();
  readonly selectedCreditor$ = this.selectedCreditorSubject.asObservable();
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  // Filtrado reactivo por texto
  readonly filteredCreditors$: Observable<CreditorWithInvoices[]> =
    combineLatest([this.creditors$, this.keyword$]).pipe(
      map(([creditors, keyword]) =>
        filterByKeyword(creditors, keyword, [
          (b) => b.company,
          (b) => b.contact,
        ])
      ),
      startWith([])
    );

  // ───────── LISTA ─────────
  loadAllCreditors(): void {
    this.reloadCreditors(null);
  }

  loadCreditorsByCategory(category: string): void {
    this.reloadCreditors(category);
  }

  private reloadCreditors(filter: string | null): void {
    this.setCurrentFilter(filter);
    this.listLoadingSubject.next(true);

    const request$ = filter
      ? this.creditorsService.getCreditorsByCategory(filter)
      : this.creditorsService.getCreditors();

    console.log('📡 Llamando a backend de acreedores...');

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors) => {
          console.log('✅ Datos recibidos:', creditors);
          this.updateCreditorState(creditors);
        }),
        catchError((err) => {
          console.error('❌ Error en loadAllCreditors:', err);
          this.generalService.handleHttpError(err);
          this.updateCreditorState([]);
          return EMPTY;
        }),
        finalize(() => {
          console.log('🟡 Carga completada (finalize)');
          this.listLoadingSubject.next(false);
        })
      )
      .subscribe();
  }
  // ───────── ITEM ─────────
  loadCreditorById(id: number): void {
    this.itemLoadingSubject.next(true);

    this.creditorsService
      .getCreditorById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditor) => this.selectedCreditorSubject.next(creditor)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── CRUD ─────────
  addCreditor(creditor: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.creditorsService.add(creditor).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editCreditor(creditor: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.creditorsService.edit(creditor).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteCreditor(id: number): void {
    this.itemLoadingSubject.next(true);

    this.creditorsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── FILTRO Y ESTADO ─────────
  setKeyword(keyword: string): void {
    this.keywordSubject.next(keyword.trim());
  }

  clearSelectedCreditor(): void {
    this.selectedCreditorSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.creditorsSubject.getValue();
    this.filteredCreditorsSubject.next(
      filterByKeyword(all, keyword, [(b) => b.company, (b) => b.contact])
    );
  }
  private setCurrentFilter(filter: string | null): void {
    this.currentFilter = filter;
  }

  private reloadCurrentFilter(): void {
    this.reloadCreditors(this.currentFilter);
  }

  private updateCreditorState(creditors: CreditorWithInvoices[]): void {
    this.creditorsSubject.next(creditors);
    this.filteredCreditorsSubject.next(creditors);
  }
}
