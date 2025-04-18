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
import { MatIconModule } from '@angular/material/icon';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { CircleIndicatorComponent } from 'src/app/modules/dashboard/components/circle-indicator/circle-indicator.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { EurosFormatPipe } from 'src/app/shared/pipe/eurosFormat.pipe';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    IconActionComponent,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    EurosFormatPipe,
    CircleIndicatorComponent,
  ],
  selector: 'app-table-invoices',
  templateUrl: './table-invoices.component.html',
  styleUrls: ['./table-invoices.component.css'],
})
export class TableInvoicesComponent {
  private _liveAnnouncer = inject(LiveAnnouncer);
  private subsidiesService = inject(SubsidiesService);

  @Input() tableInsideSubsidy = false;
  @Input() type: TypeList = TypeList.Invoices;
  @Input() data: InvoiceModelFullData[] = [];
  @Input() delete? = true;
  @Input() edit? = true;
  @Output() openModal = new EventEmitter<{
    type: TypeList;
    action: TypeActionModal;
    item: any;
  }>();
  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<InvoiceModelFullData>();
  subsidies: any;
  typeActionModal = TypeActionModal;
  searchKeywordFilter = new FormControl();
  total_amount: number = 0;
  nameSubsidy = this.subsidiesService.subsidiesMap;

  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource<InvoiceModelFullData>(
      this.data || []
    );
    this.dataSource.sort = this.sort;

    this.displayedColumns = [
      'number',
      'type_invoice',
      'number_invoice',
      'date_invoice',
      // Solo incluir 'date_accounting' si tableInsideSubsidy es true
      ...(!this.tableInsideSubsidy ? ['date_accounting'] : []),
      'date_payment',
      'creditor',
      'description',
      'amount',
      'iva',
      'irpf',
      'total_amount',
      'subsidy_name',
      'project_title',
      'actions',
    ];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.dataSource.data = changes['data'].currentValue || [];

      // Forzar la actualización de la suscripción a los datos
      this.dataSource._updateChangeSubscription();
    }
  }

  ngAfterViewInit(): void {
    // this.sort.sort({ id: 'date_invoice', start: 'asc', disableClear: false });
  }
  getTotalIrpf(): number {
    return this.dataSource.data
      .map((item) => Number(item.irpf) || 0) // 🔹 Convertir a número
      .reduce((acc, value) => acc + value, 0);
  }

  getTotalAmount(): number {
    return this.dataSource.data
      .map((item) => Number(item.total_amount) || 0) // 🔹 Convertir a número
      .reduce((acc, value) => acc + value, 0);
  }

  announceSortChange(sortState: Sort): void {
    if (sortState.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this._liveAnnouncer.announce('Sorting cleared');
    }
  }

  onOpenModal(type: TypeList, action: TypeActionModal, item: any): void {
    this.openModal.emit({ type, action, item });
  }
}
