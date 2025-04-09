import { LiveAnnouncer } from '@angular/cdk/a11y';
import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { FilterTransformCodePipe } from 'src/app/shared/pipe/filterTransformCode.pipe';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
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
  ],
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css'],
})
export class TableComponent {
  private _liveAnnouncer = inject(LiveAnnouncer);
  @Input() type: TypeList = TypeList.Books;
  @Input() data: any[] = [];
  @Input() headerColumns: ColumnModel[] = [];
  @Output() openModal = new EventEmitter<{
    action: TypeActionModal;
    item: any;
  }>();
  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource();
  typeActionModal = TypeActionModal;
  searchKeywordFilter = new FormControl();
  TypeList = TypeList;

  @ViewChild(MatSort) sort!: MatSort;

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    const totalFixedHeight = 800;

    const headerRow: HTMLElement | null =
      document.querySelector('.custom-list-row');
    if (headerRow) {
      headerRow.style.top = `${totalFixedHeight}px`;
    }
  }

  ngOnInit(): void {
    this.initDisplayedColumns();
    this.dataSource = new MatTableDataSource(this.data || []);
    this.dataSource.sort = this.sort; // Inicializa el sorting
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
    // Asegurarse de que el sorting esté correctamente asignado después de que la vista se haya inicializado
    this.dataSource.sort = this.sort;
  }

  initDisplayedColumns(): void {
    this.displayedColumns = this.headerColumns.map((column) => column.key);
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

  onOpenModal(action: TypeActionModal, item: any): void {
    this.openModal.emit({ action, item });
  }
  areDatesEqual(date1: string | Date, date2: string | Date): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getTime() === d2.getTime();
  }
}
