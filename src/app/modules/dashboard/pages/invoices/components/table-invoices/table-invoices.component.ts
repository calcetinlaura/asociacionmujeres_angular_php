import {
  Component,
  EventEmitter,
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
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormControl } from '@angular/forms';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InvoiceModel } from 'src/app/core/interfaces/invoice.interface';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { EurosFormatPipe } from '../../../../../../shared/pipe/eurosFormat.pipe';

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
  @Input() data: InvoiceModel[] = [];
  @Input() delete? = true;
  @Input() edit? = true;
  @Output() openModal = new EventEmitter<{
    type: TypeList;
    action: TypeActionModal;
    item: any;
  }>();
  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<InvoiceModel>();
  subsidies: any;
  typeActionModal = TypeActionModal;
  searchKeywordFilter = new FormControl();
  totalAmount: number = 0;
  nameSubsidy = this.subsidiesService.subsidiesMap;

  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource<InvoiceModel>(this.data || []);
    this.dataSource.sort = this.sort;

    this.displayedColumns = [
      'number',
      'typeInvoice',
      'numberInvoice',
      'dateInvoice',
      // Solo incluir 'dateAccounting' si tableInsideSubsidy es true
      ...(!this.tableInsideSubsidy ? ['dateAccounting'] : []),
      'datePayment',
      'creditor',
      'description',
      'amount',
      'iva',
      'irpf',
      'totalAmount',
      // 'totalAmountIrpf',
      'subsidy',
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
    // this.sort.sort({ id: 'dateInvoice', start: 'asc', disableClear: false });
  }
  getTotalIrpf(): number {
    return this.dataSource.data
      .map((item) => item.irpf || 0)
      .reduce((acc, value) => acc + value, 0);
  }
  getTotalAmount(): number {
    return this.dataSource.data
      .map((item) => item.totalAmount || 0)
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
