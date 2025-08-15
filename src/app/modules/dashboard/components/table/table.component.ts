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
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { CalculateAgePipe } from 'src/app/shared/pipe/caculate_age.pipe';
import { EurosFormatPipe } from 'src/app/shared/pipe/eurosFormat.pipe';
import { FilterTransformCodePipe } from 'src/app/shared/pipe/filterTransformCode.pipe';
import { HasValuePipe } from 'src/app/shared/pipe/hasValue.pipe';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
import { ParseJsonPipe } from 'src/app/shared/pipe/parseJson.pipe';
import { PhoneFormatPipe } from 'src/app/shared/pipe/phoneFormat.pipe';
import { CircleIndicatorComponent } from '../circle-indicator/circle-indicator.component';

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
    ParseJsonPipe,
  ],
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css'],
})
export class TableComponent {
  private readonly subsidiesService = inject(SubsidiesService);

  private _liveAnnouncer = inject(LiveAnnouncer);
  @Input() displayedColumns: string[] = [];
  @Input() columnVisibility: { [key: string]: boolean } = {};
  @Input() typeSection: TypeList = TypeList.Books;
  @Input() typeModal: TypeList = TypeList.Books;
  @Input() data: any[] = [];
  @Input() headerColumns: ColumnModel[] = [];
  @Input() topHeader = 246;
  @Output() openModal = new EventEmitter<{
    typeModal: TypeList;
    action: TypeActionModal;
    item: any;
  }>();
  nameSubsidy = this.subsidiesService.subsidiesMap;

  dataSource = new MatTableDataSource();
  typeActionModal = TypeActionModal;
  searchKeywordFilter = new FormControl();
  TypeList = TypeList;

  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.initDisplayedColumns();

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
    return (this.dataSource.data as Record<string, any>[])
      .map((item) => Number(item[key]) || 0)
      .reduce((acc, value) => acc + value, 0);
  }
  get showFooter(): boolean {
    return this.headerColumns.some((col) => col.footerTotal);
  }
}
