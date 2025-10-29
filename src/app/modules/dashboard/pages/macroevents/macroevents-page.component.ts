import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { filter, map, take, tap } from 'rxjs';

import { FiltersFacade } from 'src/app/application/filters.facade';
import { MacroeventsFacade } from 'src/app/application/macroevents.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';

import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

import { EventsFacade } from 'src/app/application/events.facade';
import { ModalFacade } from 'src/app/application/modal.facade';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { count, sortById } from 'src/app/shared/utils/facade.utils';

@Component({
  selector: 'app-macroevents-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    ModalShellComponent,
    PageToolbarComponent,
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './macroevents-page.component.html',
})
export class MacroeventsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly generalService = inject(GeneralService);
  private readonly eventsFacade = inject(EventsFacade);
  private readonly modalFacade = inject(ModalFacade);
  readonly macroeventsFacade = inject(MacroeventsFacade);
  readonly filtersFacade = inject(FiltersFacade);

  headerListMacroevents: ColumnModel[] = [
    { title: 'Cartel', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
    { title: 'Fecha', key: 'start', sortable: true, width: ColumnWidth.SM },
    { title: 'Eventos', key: 'events', sortable: true, showLengthOnly: true },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      innerHTML: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.XL,
    },
    {
      title: 'Resumen',
      key: 'summary',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.XS,
    },
    {
      title: 'Municipio',
      key: 'town',
      showIndicatorOnEmpty: true,
      sortable: true,
      width: ColumnWidth.SM,
    },
  ];

  readonly col = useColumnVisibility(
    'macroevents-table',
    this.headerListMacroevents,
    ['town']
  );

  // Lista reactiva derivada
  readonly list = useEntityList<MacroeventModelFullData>({
    filtered$: this.macroeventsFacade.filteredMacroevents$.pipe(
      map((v) => v ?? [])
    ),
    sort: (arr) => sortById(arr),
    count: (arr) => count(arr),
  });
  readonly TypeList = TypeList;
  readonly hasRowsSig = computed(() => this.list.countSig() > 0);

  // ────────────────────────────────────────────────
  // Modal controlado por ModalFacade
  // ────────────────────────────────────────────────
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;

  readonly currentYear = this.generalService.currentYear;

  // Ref para impresión
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // Ref para limpiar buscador del toolbar
  @ViewChild(PageToolbarComponent)
  private toolbarComponent!: PageToolbarComponent;

  // ────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────
  ngOnInit(): void {
    this.filtersFacade.loadFiltersFor(TypeList.Macroevents, '', 2018);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.filterSelected(this.currentYear.toString()));
  }

  // ────────────────────────────────────────────────
  // Filtros / búsqueda
  // ────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.filtersFacade.selectFilter(filter);

    // Limpia el buscador del toolbar si existe
    if (this.toolbarComponent) {
      this.toolbarComponent.clearSearch();
    }

    if (!filter) {
      this.macroeventsFacade.loadAllMacroevents();
    } else {
      this.macroeventsFacade.loadMacroeventsByYear(Number(filter));
    }
  }

  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.macroeventsFacade.applyFilterWord(keyword);
  }

  // ────────────────────────────────────────────────
  // Modal + navegación entre entidades
  // ────────────────────────────────────────────────
  addNewMacroeventModal(): void {
    this.macroeventsFacade.clearSelectedMacroevent();
    this.modalFacade.open(TypeList.Macroevents, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: MacroeventModelFullData;
  }): void {
    const { typeModal, action, item } = event;

    if (
      typeModal === TypeList.Macroevents &&
      action !== TypeActionModal.Create &&
      item?.id
    ) {
      this.macroeventsFacade
        .getMacroeventByIdOnce(item.id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap((fresh) => this.modalFacade.open(typeModal, action, fresh))
        )
        .subscribe(); // nada en subscribe
      return;
    }

    this.modalFacade.open(typeModal, action, item ?? null);
  }

  onOpenEvent(eventId: number): void {
    this.eventsFacade.loadEventById(eventId);

    this.eventsFacade.selectedEvent$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((e): e is EventModelFullData => !!e),
        take(1),
        tap((event) =>
          this.modalFacade.open(TypeList.Events, TypeActionModal.Show, event)
        )
      )
      .subscribe();
  }

  onBackModal(): void {
    this.modalFacade.back();
  }

  onCloseModal(): void {
    this.modalFacade.close();
  }

  // ────────────────────────────────────────────────
  // CRUD
  // ────────────────────────────────────────────────
  onDelete({ type, id }: { type: TypeList; id: number }): void {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Macroevents]: (x) => this.macroeventsFacade.deleteMacroevent(x),
    };
    actions[type]?.(id);
  }

  sendFormMacroevent(event: { itemId: number; formData: FormData }): void {
    const request$ = event.itemId
      ? this.macroeventsFacade.editMacroevent(event.formData)
      : this.macroeventsFacade.addMacroevent(event.formData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.modalFacade.close())
      )
      .subscribe();
  }

  // ────────────────────────────────────────────────
  // PDF
  // ────────────────────────────────────────────────
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'macroeventos.pdf',
      preset: 'compact',
      orientation: 'portrait',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }
}
