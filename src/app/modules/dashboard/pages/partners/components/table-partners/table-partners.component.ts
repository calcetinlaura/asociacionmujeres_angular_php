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
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormControl } from '@angular/forms';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { CalculateAgePipe } from '../../../../../../shared/pipe/caculate_age.pipe';
import { CircleIndicatorComponent } from '../../../../components/circle-indicator/circle-indicator.component';
import { ChangeDetectorRef } from '@angular/core';
import { ItemImagePipe } from '../../../../../../shared/pipe/item-img.pipe';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    IconActionComponent,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    CalculateAgePipe,
    CircleIndicatorComponent,
    ItemImagePipe,
  ],
  selector: 'app-table-partners',
  templateUrl: './table-partners.component.html',
  styleUrls: ['./table-partners.component.css'],
})
export class TablePartnersComponent {
  private _liveAnnouncer = inject(LiveAnnouncer);
  private cdr = inject(ChangeDetectorRef);

  @Input() type: TypeList = TypeList.Partners;
  @Input() data: PartnerModel[] = [];
  @Output() openModal = new EventEmitter<{
    action: TypeActionModal;
    item: any;
  }>();

  displayedColumns: string[] = [
    'number',
    'img',
    'name',
    'surname',
    'birthday',
    'address',
    'phone',
    'email',
    'cuotas',
    'years',
    'actions',
  ];

  dataSource = new MatTableDataSource<PartnerModel>();

  typeActionModal = TypeActionModal;
  searchKeywordFilter = new FormControl();
  total_amount: number = 0;
  private columnSortOrder: { [key: string]: 'asc' | 'desc' } = {};
  currentYear = 0;
  processedData: PartnerModel[] = [];

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
    this.dataSource = new MatTableDataSource<PartnerModel>(this.data || []);
    // Inicializar el estado de orden para cada columna en 'asc' cuando se inicializa
    this.displayedColumns.forEach((column) => {
      this.columnSortOrder[column] = 'asc'; // Inicializar todas en ascendente
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.currentYear = new Date().getFullYear();

      setTimeout(() => {
        this.dataSource.data = (
          changes['data'].currentValue as PartnerModel[]
        ).map((partner: PartnerModel) => {
          return {
            ...partner,
            hasPaidLastYear: partner.cuotas
              .map(Number)
              .includes(this.currentYear),
            totalYearsPaid: partner.cuotas.length,
          };
        });

        this.dataSource._updateChangeSubscription();

        // 🔹 Forzar la actualización de la vista después de que Angular haya terminado su ciclo de cambios
        this.cdr.detectChanges();
      });
    }
  }

  ngAfterViewInit(): void {
    // Asegurarse de que el sorting esté correctamente asignado después de que la vista se haya inicializado
    this.dataSource.sort = this.sort;
    // Ordenar por id que no es visible, pero existe en el objeto
    this.dataSource.sortingDataAccessor = (data, sortHeaderId) => {
      switch (sortHeaderId) {
        case 'id':
          return data.id;
        default:
          return data[sortHeaderId];
      }
    };

    this.sort.sort({ id: 'id', start: 'desc', disableClear: false }); // Cuidado con el case 'id'
  }

  // Método para ordenar por columnas
  onSort(column: string): void {
    const currentOrder = this.columnSortOrder[column];

    // Cambiar el estado de orden
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    this.columnSortOrder[column] = newOrder;

    // Aplicar el nuevo orden
    if (this.dataSource.sort) {
      this.dataSource.sort.sort({
        id: column,
        start: newOrder,
        disableClear: true,
      });

      this.announceSortChange({ direction: newOrder, active: column } as Sort); // Corregir aquí: usar active
    }
  }

  announceSortChange(sortState: Sort): void {
    if (sortState.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    }
  }

  onOpenModal(action: TypeActionModal, item: any): void {
    this.openModal.emit({ action, item });
  }
}
