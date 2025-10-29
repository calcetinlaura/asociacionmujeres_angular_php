import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { filter, map, take, tap } from 'rxjs';

import { AgentsFacade } from 'src/app/application/agents.facade';
import { FiltersFacade } from 'src/app/application/filters.facade';
import { AgentsModelFullData } from 'src/app/core/interfaces/agent.interface';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
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
import { MacroeventsFacade } from 'src/app/application/macroevents.facade';
import { ModalFacade } from 'src/app/application/modal.facade';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { count, sortById } from 'src/app/shared/utils/facade.utils';

@Component({
  selector: 'app-agents-page',
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
  templateUrl: './agents-page.component.html',
})
export class AgentsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalFacade = inject(ModalFacade);
  private readonly eventsFacade = inject(EventsFacade);
  private readonly macroeventsFacade = inject(MacroeventsFacade);
  private readonly pdfPrintService = inject(PdfPrintService);
  readonly agentsFacade = inject(AgentsFacade);
  readonly filtersFacade = inject(FiltersFacade);

  //  Referencia al toolbar (para limpiar buscador)
  @ViewChild(PageToolbarComponent)
  private toolbarComponent!: PageToolbarComponent;

  // ────────────────────────────────────────────────
  // Columnas
  // ────────────────────────────────────────────────
  headerListAgents: ColumnModel[] = [
    { title: 'Imagen', key: 'img', sortable: false },
    { title: 'Nombre', key: 'name', sortable: true },
    {
      title: 'Contacto',
      key: 'contact',
      sortable: true,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Teléfono',
      key: 'phone',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.XS,
      pipe: 'phoneFormat',
      textAlign: 'center',
    },
    {
      title: 'Email',
      key: 'email',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.LG,
    },
    {
      title: 'Municipio',
      key: 'town',
      showIndicatorOnEmpty: true,
      sortable: true,
      textAlign: 'center',
    },
    {
      title: 'Categoría',
      key: 'category',
      sortable: true,
      width: ColumnWidth.MD,
      pipe: 'filterTransformCode',
      pipeArg: 'categoryAgents',
    },
  ];

  readonly col = useColumnVisibility('agents-table', this.headerListAgents);

  // Lista derivada reactiva
  readonly list = useEntityList<AgentsModelFullData>({
    filtered$: this.agentsFacade.filteredAgents$.pipe(map((v) => v ?? [])),
    sort: (arr) => sortById(arr),
    count: (arr) => count(arr),
  });
  readonly TypeList = TypeList;
  readonly hasRowsSig = computed(() => this.list.countSig() > 0);

  // ────────────────────────────────────────────────
  // Modal (usando ModalFacade)
  // ────────────────────────────────────────────────
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;
  readonly canGoBackSig = this.modalFacade.canGoBackSig;

  // Ref impresión
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────
  ngOnInit(): void {
    //  Cargamos filtros desde la fachada unificada
    this.filtersFacade.loadFiltersFor(TypeList.Agents);
  }
  ngAfterViewInit(): void {
    //  lo llamamos cuando el input ya existe
    setTimeout(() => this.filterSelected(''));
  }

  // ────────────────────────────────────────────────
  // Filtros / búsqueda
  // ────────────────────────────────────────────────
  filterSelected(filter: string): void {
    // Actualiza selección global
    this.filtersFacade.selectFilter(filter);

    // ✅ Limpia el buscador del toolbar
    if (this.toolbarComponent) {
      this.toolbarComponent.clearSearch();
    }

    if (!filter) {
      this.agentsFacade.loadAllAgents();
    } else {
      this.agentsFacade.loadAgentsByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.agentsFacade.applyFilterWord(keyword);
  }

  // ────────────────────────────────────────────────
  // Modal + CRUD
  // ────────────────────────────────────────────────
  addNewAgentModal(): void {
    this.agentsFacade.clearSelectedAgent();
    this.modalFacade.open(TypeList.Agents, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: AgentsModelFullData;
  }): void {
    const { typeModal, action, item } = event;
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
  onOpenMacroEvent(macroId: number): void {
    if (!macroId) return;

    this.macroeventsFacade.loadMacroeventById(macroId);

    this.macroeventsFacade.selectedMacroevent$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((m): m is MacroeventModelFullData => !!m),
        take(1),
        tap((macro) =>
          this.modalFacade.open(
            TypeList.Macroevents,
            TypeActionModal.Show,
            macro
          )
        )
      )
      .subscribe();
  }
  onCloseModal(): void {
    this.modalFacade.close();
  }

  onBackModal(): void {
    this.modalFacade.back();
  }

  // ──────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────
  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Agents]: (x) => this.agentsFacade.deleteAgent(x),
    };
    actions[type]?.(id);
  }

  sendFormAgent(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.agentsFacade.editAgent(event.formData)
      : this.agentsFacade.addAgent(event.formData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        // efecto: cerrar la modal al completar correctamente
        tap(() => this.modalFacade.close())
      )
      .subscribe();
  }

  // ────────────────────────────────────────────────
  // Impresión
  // ────────────────────────────────────────────────
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'agentes.pdf',
      preset: 'compact',
      orientation: 'portrait',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }
}
