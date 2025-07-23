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
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { FilterTransformCodePipe } from 'src/app/shared/pipe/filterTransformCode.pipe';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
import { PhoneFormatPipe } from 'src/app/shared/pipe/phoneFormat.pipe';
import { ButtonComponent } from '../../../../shared/components/buttons/button/button.component';
import { CalculateAgePipe } from '../../../../shared/pipe/caculate_age.pipe';
import { EurosFormatPipe } from '../../../../shared/pipe/eurosFormat.pipe';
import { HasValuePipe } from '../../../../shared/pipe/hasValue.pipe';
import { CircleIndicatorComponent } from '../circle-indicator/circle-indicator.component';
declare var html2pdf: any;
@Component({
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    IconActionComponent,
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
    CalculateAgePipe,
    ButtonComponent,
  ],
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css'],
})
export class TableComponent {
  private readonly subsidiesService = inject(SubsidiesService);
  private readonly invoicesService = inject(InvoicesService);

  private _liveAnnouncer = inject(LiveAnnouncer);
  @Input() typeSection: TypeList = TypeList.Books;
  @Input() typeModal: TypeList = TypeList.Books;
  @Input() data: any[] = [];
  @Input() headerColumns: ColumnModel[] = [];
  @Input() topFilter = 270;
  @Input() topHeader = 326;
  @Output() openModal = new EventEmitter<{
    typeModal: TypeList;
    action: TypeActionModal;
    item: any;
  }>();
  nameSubsidy = this.subsidiesService.subsidiesMap;
  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource();
  typeActionModal = TypeActionModal;
  searchKeywordFilter = new FormControl();
  TypeList = TypeList;
  columnVisibility: { [key: string]: boolean } = {};
  selectedColumns: string[] = [];

  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.headerColumns.forEach((col) => {
      this.columnVisibility[col.key] = true; // primero inicializas visibilidad
    });

    this.initDisplayedColumns(); // luego construyes displayedColumns

    this.dataSource = new MatTableDataSource(this.data || []);
    this.dataSource.sort = this.sort;
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

  initDisplayedColumns(): void {
    this.displayedColumns = this.getVisibleColumns();
    this.displayedColumns.push('actions');
    this.displayedColumns.unshift('number');
  }

  announceSortChange(sortState: Sort): void {
    if (sortState.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this._liveAnnouncer.announce('Sorting cleared');
    }
  }
  toggleColumn(key: string) {
    this.columnVisibility[key] = !this.columnVisibility[key];
    this.initDisplayedColumns();
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
  updateVisibleColumns() {
    this.headerColumns.forEach((col) => {
      this.columnVisibility[col.key] = this.selectedColumns.includes(col.key);
    });
    this.initDisplayedColumns(); // Recalcula las columnas mostradas
  }

  trackByKey(index: number, col: ColumnModel) {
    return col.key;
  }

  hasValueBoolean(value: any): boolean {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return value !== 0;
    return !!value;
  }

  getColumnTotal(key: string): number {
    return (this.dataSource.data as Record<string, any>[])
      .map((item) => Number(item[key]) || 0)
      .reduce((acc, value) => acc + value, 0);
  }

  downloadFilteredPdfs(): void {
    if (this.typeSection !== TypeList.Invoices) return;

    const data = this.dataSource.filteredData || [];

    const pdfFiles = data
      .filter((invoice: any) => invoice.invoice_pdf)
      .map((invoice: any) => {
        const fileName = invoice.invoice_pdf;
        const yearMatch = fileName.match(/^(\d{4})_/);
        const yearFolder = yearMatch ? yearMatch[1] : '';
        return `${yearFolder}/${fileName}`;
      });

    if (!pdfFiles.length) {
      alert('No hay PDFs para descargar.');
      return;
    }

    this.invoicesService.downloadFilteredPdfs(pdfFiles).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'facturas.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('💥 Error al descargar ZIP:', err);
        alert('Error al descargar el ZIP. Revisa la consola.');
      },
    });
  }
  printTableAsPdf(): void {
    const table = document.querySelector('table');

    if (!table) {
      alert('No se encontró la tabla');
      return;
    }

    const options = {
      margin: 0.2,
      filename: 'tabla-facturas.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
    };

    html2pdf().set(options).from(table).save();
  }
}
