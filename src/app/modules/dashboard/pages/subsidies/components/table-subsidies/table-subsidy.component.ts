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
import { SubsidyModel } from 'src/app/core/interfaces/subsidy.interface';
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
    CircleIndicatorComponent,
    EurosFormatPipe,
  ],
  selector: 'app-table-subsidy',
  templateUrl: './table-subsidy.component.html',
  styleUrls: ['./table-subsidy.component.css'],
})
export class TableSubsidyComponent {
  private subsidiesService = inject(SubsidiesService);
  private _liveAnnouncer = inject(LiveAnnouncer);

  @Input() type: TypeList = TypeList.Books;
  @Input() data: SubsidyModel[] = [];
  @Output() openModal = new EventEmitter<{
    type: TypeList;
    action: TypeActionModal;
    item: any;
  }>();

  displayedColumns: string[] = [
    'name',
    'year',
    'date_presentation',
    'date_justification',
    'period',
    'activities',
    'invoices',
    'url_presentation',
    'url_justification',
    'amount_requested',
    'amount_granted',
    'amount_justified',
    'amount_association',
    'actions',
  ];

  dataSource = new MatTableDataSource<SubsidyModel>();

  typeActionModal = TypeActionModal;
  searchKeywordFilter = new FormControl();
  total_amount: number = 0;
  nameSubsidy = this.subsidiesService.subsidiesMap;

  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource<SubsidyModel>(this.data || []);
    this.dataSource.sort = this.sort;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.dataSource.data = changes['data'].currentValue || [];

      // Forzar la actualización de la suscripción a los datos
      this.dataSource._updateChangeSubscription();
    }
  }

  getTotalAmountGranted(): number {
    return this.dataSource.data
      .map((item) => Number(item.amount_granted) || 0)
      .reduce((acc, value) => acc + value, 0);
  }
  getTotalAmountAssociation(): number {
    return this.dataSource.data
      .map((item) => Number(item.amount_association) || 0)
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
