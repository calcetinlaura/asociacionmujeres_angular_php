import { LiveAnnouncer } from '@angular/cdk/a11y';
import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { ProjectModelFullData } from 'src/app/core/interfaces/project.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { EventPublishPillComponent } from 'src/app/modules/dashboard/pages/events/components/publish-pill/publish-pill.component';
import {
  ActionBarComponent,
  ActionItem,
  ActionPayload,
} from 'src/app/shared/components/action-bar/action-bar.component';
import { TypeInvoiceBadgeComponent } from 'src/app/shared/components/type-invoice-badge/type-invoice-badge.component';
import { AgePipe } from 'src/app/shared/pipe/caculate_age.pipe';
import {
  DictTranslatePipe,
  DictType,
} from 'src/app/shared/pipe/dict-translate.pipe';
import { EurosFormatPipe } from 'src/app/shared/pipe/eurosFormat.pipe';
import { FilterTransformCodePipe } from 'src/app/shared/pipe/filterTransformCode.pipe';
import { HasValuePipe } from 'src/app/shared/pipe/hasValue.pipe';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
import { PhoneFormatPipe } from 'src/app/shared/pipe/phoneFormat.pipe';
import { SafeHtmlPipe } from 'src/app/shared/pipe/safe-html.pipe';
import { isDraft, isScheduled } from 'src/app/shared/utils/events.utils';
import { AudienceBadgesPipe } from '../../pipe/audience-badges.pipe';
import { HmsPipe } from '../../pipe/dateTime_form.pipe';
import { CircleIndicatorComponent } from '../circle-indicator/circle-indicator.component';
@Component({
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    CircleIndicatorComponent,
    ItemImagePipe,
    PhoneFormatPipe,
    FilterTransformCodePipe,
    EurosFormatPipe,
    MatCheckboxModule,
    MatFormFieldModule,
    MatMenuModule,
    MatSelectModule,
    HasValuePipe,
    AgePipe,
    HmsPipe,
    ItemImagePipe,
    DictTranslatePipe,
    AudienceBadgesPipe,
    ActionBarComponent,
    SafeHtmlPipe,
    TypeInvoiceBadgeComponent,
    EventPublishPillComponent,
  ],
  providers: [ItemImagePipe],
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css'],
})
export class TableComponent {
  private readonly subsidiesService = inject(SubsidiesService);
  private _liveAnnouncer = inject(LiveAnnouncer);
  private itemImagePipe = inject(ItemImagePipe);

  @Input() displayedColumns: string[] = [];
  @Input() columnVisibility: { [key: string]: boolean } = {};
  @Input() typeSection: TypeList = TypeList.Books;
  @Input() typeModal: TypeList = TypeList.Books;
  @Input() data: any[] = [];
  @Input() headerColumns: ColumnModel[] = [];
  @Input() topHeader = 246;
  @Input() showNumberColumn = true;
  @Input() printExcludeColumns: string[] | null = null; // p.ej. ['invoice_pdf','proof_pdf','total_amount', ...]
  @Input() printIncludeNumber = true; // si quieres imprimir la columna de numeración
  @Input() showFooterEnabled = true;
  @Input() printIncludeActions = false;
  @Input() eventsWithReport: Set<number> = new Set<number>();
  @Output() openModal = new EventEmitter<{
    typeModal: TypeList;
    action: TypeActionModal;
    item: any;
  }>();
  nameMovement = this.subsidiesService.movementMap;
  nameSubsidy = this.subsidiesService.subsidiesMap;

  dataSource = new MatTableDataSource();
  typeActionModal = TypeActionModal;
  searchKeywordFilter = new FormControl();
  TypeList = TypeList;
  dictType = DictType;
  readonly baseActions: ActionItem[] = [
    { icon: 'uil-eye', tooltip: 'Ver', type: 'view' },
    { icon: 'uil-edit', tooltip: 'Editar', type: 'edit' },
  ];

  readonly actionsEvents: ActionItem[] = [
    ...this.baseActions,
    { icon: 'uil-copy', tooltip: 'Duplicar', type: 'duplicate' },
    {
      icon: 'uil-image-redo',
      tooltip: 'Descargar imagen',
      type: 'download-image',
    },
    { icon: 'uil-trash-alt', tooltip: 'Eliminar', type: 'remove' },
  ];

  readonly actionsWithImage: ActionItem[] = [
    ...this.baseActions,
    {
      icon: 'uil-image-redo',
      tooltip: 'Descargar imagen',
      type: 'download-image',
    },
    { icon: 'uil-trash-alt', tooltip: 'Eliminar', type: 'remove' },
  ];

  readonly actionsBasic: ActionItem[] = [
    ...this.baseActions,
    { icon: 'uil-trash-alt', tooltip: 'Eliminar', type: 'remove' },
  ];
  readonly isDraft = isDraft;
  readonly isScheduled = isScheduled;

  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.initDisplayedColumns();

    this.dataSource = new MatTableDataSource(this.data || []);
    this.dataSource.sort = this.sort;
    console.log('LISTADO DE EVENTOS', this.eventsWithReport);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.dataSource.data = changes['data'].currentValue || [];

      // Forzar la actualización de la suscripción a los datos
      this.dataSource._updateChangeSubscription();
    }

    if (changes['headerColumns']) {
      this.initDisplayedColumns();
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      if (['organizer', 'collaborator', 'sponsor'].includes(property)) {
        return item[property]?.[0]?.name?.toLowerCase() || '';
      }

      if (property === 'espacioTable') {
        return item.placeData?.name?.toLowerCase() || '';
      }

      const value = item[property];
      return typeof value === 'string' ? value.toLowerCase() : value;
    };
    this.dataSource.sort = this.sort;
  }
  getRowClasses(row: any) {
    if (this.typeSection !== this.TypeList.Events) return {};
    return {
      // Borrador → amarillo
      '[&_.mat-mdc-cell]:bg-eventDraftRow [&_.mat-mdc-footer-cell]:bg-eventDraftRow':
        this.isDraft(row),
      // Programado → verde
      '[&_.mat-mdc-cell]:bg-eventSchedulerRow [&_.mat-mdc-footer-cell]:bg-eventSchedulerRow':
        this.isScheduled(row),
    };
  }
  initDisplayedColumns(): void {
    this.displayedColumns = this.getVisibleColumns();

    // Añadimos columna de informe solo para eventos
    if (this.typeSection === this.TypeList.Events) {
      this.displayedColumns.push('report');
    }

    this.displayedColumns.push('actions');

    if (this.showNumberColumn) {
      this.displayedColumns.unshift('number');
    }
  }
  announceSortChange(sortState: Sort): void {
    if (sortState.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this._liveAnnouncer.announce('Sorting cleared');
    }
  }

  onOpenModal(typeModal: TypeList, action: TypeActionModal, item: any): void {
    this.openModal.emit({ typeModal, action, item });
  }

  areDatesEqual(date1: string | Date, date2: string | Date): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getTime() === d2.getTime();
  }
  getTotalInvoiceAmount(element: any): number {
    if (!element?.invoices || !Array.isArray(element.invoices)) {
      return 0;
    }
    return element.invoices.reduce((sum: number, inv: any) => {
      const amount = Number(inv?.total_amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }
  getTotalActivitiesAmount(element: any): number {
    if (!element?.activities || !Array.isArray(element.activities)) {
      return 0;
    }
    return element.activities.reduce((sum: number, act: any) => {
      const amount = Number(act?.budget);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }
  get visibleHeaderColumns(): ColumnModel[] {
    return this.headerColumns.filter((col) => this.columnVisibility[col.key]);
  }
  getVisibleColumns(): string[] {
    return this.headerColumns
      .filter((col) => this.columnVisibility[col.key])
      .map((col) => col.key);
  }

  trackByColumnKey(index: number, col: ColumnModel) {
    return col.key;
  }

  hasValueBoolean(value: any): boolean {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return value !== 0;
    return !!value;
  }

  getColumnTotal(key: string): number {
    const data = this.dataSource.data as Record<string, any>[];

    switch (key) {
      case 'activities':
        return data.reduce((sum, item) => {
          const project = item as ProjectModelFullData;
          if (!Array.isArray(project.activities)) return sum;
          const subtotal = project.activities.reduce(
            (s, act) => s + (Number(act?.budget) || 0),
            0
          );
          return sum + subtotal;
        }, 0);

      case 'invoices':
        return data.reduce((sum, item) => {
          const project = item as ProjectModelFullData;
          if (!Array.isArray(project.invoices)) return sum;
          const subtotal = project.invoices.reduce(
            (s, inv) => s + (Number(inv?.total_amount) || 0),
            0
          );
          return sum + subtotal;
        }, 0);

      default:
        return data.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
    }
  }
  get showFooter(): boolean {
    if (!this.showFooterEnabled) return false;
    return this.headerColumns.some((col) => col.footerTotal);
  }

  shouldPrintColumn(key: string): boolean {
    if (key === 'number') return !!this.printIncludeNumber;
    if (key === 'actions') return !!this.printIncludeActions;

    if (this.printExcludeColumns && this.printExcludeColumns.length) {
      return !this.printExcludeColumns.includes(key);
    }

    // 3) Por defecto, imprime todo
    return true;
  }
  private sanitizeName(name: string): string {
    return (
      name
        ?.toString()
        .trim()
        .replace(/[^\w\-]+/g, '_')
        .slice(0, 80) || 'imagen'
    );
  }

  private extFromMime(mime?: string): string {
    switch (mime) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'image/gif':
        return 'gif';
      default:
        return '';
    }
  }

  private extFromUrl(src: string): string {
    try {
      const u = new URL(src, window.location.origin);
      const m = u.pathname.match(/\.([a-z0-9]+)$/i);
      return m?.[1]?.toLowerCase() || '';
    } catch {
      const m = src.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
      return m?.[1]?.toLowerCase() || '';
    }
  }

  async downloadImg(element: any): Promise<void> {
    const src = this.itemImagePipe.transform(element?.img, this.typeSection);
    if (!src) {
      alert('Este elemento no tiene imagen.');
      return;
    }
    // 1) URL igual que en la tabla (usa tu pipe)

    if (!src) {
      alert('Este elemento no tiene imagen.');
      return;
    }

    //   // Evita descargar placeholders obvios (ajusta al nombre de tu placeholder si lo usas)
    if (/no[-_ ]?image|placeholder/i.test(src)) {
      alert('Este elemento no tiene imagen válida.');
      return;
    }

    //   // 2) Nombre de archivo: título/nombre y extensión
    const base = this.sanitizeName(element?.title || element?.name || 'imagen');
    let ext = this.extFromUrl(src);

    try {
      //     // 3) Descarga como Blob (mejor experiencia y nombre correcto)
      const res = await fetch(src, { mode: 'cors', cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (!ext) {
        const fromMime = this.extFromMime(blob.type);
        if (fromMime) ext = fromMime;
      }
      if (!ext) ext = 'jpg';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${base}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('💥 Error al descargar la imagen, abriendo fallback:', err);
      // 4) Fallback: abre en una pestaña nueva (por CORS, etc.)
      const a = document.createElement('a');
      a.href = src;
      a.target = '_blank';
      a.rel = 'noopener';
      a.download = `${base}.${ext || 'jpg'}`; // algunos navegadores lo respetan si es mismo origen
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }
  get actionsForSection(): ActionItem[] {
    switch (this.typeSection) {
      case TypeList.Events:
        return this.actionsEvents;
      case TypeList.Macroevents:
      case TypeList.Books:
      case TypeList.Movies:
      case TypeList.Recipes:
      case TypeList.Piteras:
      case TypeList.Podcasts:
      case TypeList.Articles:
      case TypeList.Partners:
      case TypeList.Agents:
        return this.actionsWithImage;
      case TypeList.Places:
      case TypeList.Projects:
      case TypeList.Invoices:
      case TypeList.Subsidies:
        return this.actionsBasic;
      default:
        return this.actionsBasic;
    }
  }

  handleAction(ev: ActionPayload, element: any) {
    switch (ev.type) {
      case 'view':
        this.onOpenModal(this.typeModal, this.typeActionModal.Show, element);
        break;
      case 'edit':
        this.onOpenModal(this.typeModal, this.typeActionModal.Edit, element);
        break;
      case 'duplicate':
        this.onOpenModal(
          this.typeModal,
          this.typeActionModal.Duplicate,
          element
        );
        break;
      case 'download-image':
        this.downloadImg(element);
        break;
      case 'remove':
        this.onOpenModal(this.typeModal, this.typeActionModal.Delete, element);
        break;
    }
  }
  onAddReport(event: any): void {
    const hasReport = this.hasReport(event);
    console.log('🟢 [TableComponent] Añadir informe', {
      event,
      hasReport,
    });

    // Si el evento ya tiene informe, lo abrimos en modo edición
    this.openModal.emit({
      typeModal: this.TypeList.EventsReports,
      action: hasReport
        ? this.typeActionModal.Edit
        : this.typeActionModal.Create,
      item: event,
    });
  }
  hasReport(row: any): boolean {
    return this.eventsWithReport.has(row.id);
  }
}
