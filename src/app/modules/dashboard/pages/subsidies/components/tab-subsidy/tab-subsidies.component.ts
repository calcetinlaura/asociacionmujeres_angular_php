import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of, tap } from 'rxjs';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { ProjectModelFullData } from 'src/app/core/interfaces/project.interface';
import { SubsidyModelFullData } from 'src/app/core/interfaces/subsidy.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { EurosFormatPipe } from 'src/app/shared/pipe/eurosFormat.pipe';
import { ButtonIconComponent } from '../../../../../../shared/components/buttons/button-icon/button-icon.component';
import { TableComponent } from '../../../../components/table/table.component';

@Component({
  selector: 'app-tab-subsidy',
  standalone: true,
  imports: [
    CommonModule,
    TextEditorComponent,
    MatIconModule,
    IconActionComponent,
    EurosFormatPipe,
    TableComponent,
    ButtonIconComponent,
  ],
  templateUrl: './tab-subsidies.component.html',
  styleUrls: ['./tab-subsidies.component.css'],
})
export class ModalShowSubsidyComponent implements OnChanges {
  private subsidiesService = inject(SubsidiesService);
  private invoicesService = inject(InvoicesService);
  private destroyRef = inject(DestroyRef);

  @Input() item!: SubsidyModelFullData;
  @Input() loadInvoices: boolean = false;
  @Output() openModal = new EventEmitter<{
    type: TypeList;
    action: TypeActionModal;
    item: any;
  }>();

  itemInvoice?: InvoiceModelFullData;
  typeList = TypeList;
  type: TypeList = TypeList.Subsidies;
  filteredInvoices: InvoiceModelFullData[] = [];
  number_invoices: number = 0;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  loading = true;
  amount_justified = 0;
  amountIrpf = 0;
  amount_association = 0;
  nameSubsidy = this.subsidiesService.subsidiesMap;
  typeActionModal = TypeActionModal;
  isModalVisible = false;

  private previousKey: string | null = null;

  headerListInvoices: ColumnModel[] = [
    {
      title: 'Tipo',
      key: 'type_invoice',
      sortable: true,
      width: ColumnWidth.XS,
    },
    {
      title: 'Nº Factura',
      key: 'number_invoice',
      width: ColumnWidth.XS,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Fecha factura',
      key: 'date_invoice',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'date : dd MMM yyyy',
    },
    {
      title: 'Fecha cuentas',
      key: 'date_accounting',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'date : dd MMM yyyy',
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Fecha pago',
      key: 'date_payment',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'date : dd MMM yyyy',
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Acreedor',
      key: 'creditor_company',
      sortable: true,
      width: ColumnWidth.LG,
    },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Cantidad',
      key: 'amount',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      footerTotal: true,
    },
    {
      title: 'IVA',
      key: 'iva',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
    },
    {
      title: 'IRPF',
      key: 'irpf',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      footerTotal: true,
    },
    {
      title: 'TOTAL',
      key: 'total_amount',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      footerTotal: true,
    },
    {
      title: 'Subvención',
      key: 'subsidy_name',
      sortable: true,
      width: ColumnWidth.SM,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Proyecto',
      key: 'project_title',
      sortable: true,
      width: ColumnWidth.SM,
      showIndicatorOnEmpty: true,
    },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      const newItem = changes['item'].currentValue as SubsidyModelFullData;

      const key = newItem?.name + '_' + newItem?.year;
      if (
        key &&
        key !== this.previousKey &&
        newItem?.name &&
        newItem?.year &&
        newItem.name.trim() !== '' &&
        newItem.year !== 0
      ) {
        this.previousKey = key;
        this.load();
      }
    }
  }

  load(): void {
    if (!this.item?.name || !this.item?.year) return;

    this.loading = true;

    this.invoicesService
      .getInvoicesBySubsidy(this.item.name, this.item.year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices: InvoiceModelFullData[]) => {
          this.filteredInvoices = invoices;
          this.number_invoices = invoices.length;
          this.amount_justified = invoices.reduce(
            (acc, inv) => acc + (inv.total_amount || 0),
            0
          );
          this.amountIrpf = invoices.reduce(
            (acc, inv) => acc + (inv.irpf || 0),
            0
          );
          this.amount_association =
            this.amount_justified - (this.item.amount_granted ?? 0);
          this.loading = false;
        }),
        catchError((err) => {
          console.error('Error cargando facturas', err);
          this.loading = false;
          return of([]);
        })
      )
      .subscribe();
  }

  getProjectTotalBudget(project: ProjectModelFullData): number {
    return (
      project.activities?.reduce((total, act) => {
        const budget = parseFloat(String(act.budget)) || 0;
        return total + budget;
      }, 0) || 0
    );
  }

  getSubsidyTotalBudget(subsidy: SubsidyModelFullData): number {
    return (
      subsidy.projects?.reduce((totalSubsidy, project) => {
        const totalProject =
          project.activities?.reduce((sum, act) => {
            return sum + (parseFloat(String(act.budget)) || 0);
          }, 0) || 0;
        return totalSubsidy + totalProject;
      }, 0) || 0
    );
  }

  onOpenModal(event: {
    type: TypeList;
    action: TypeActionModal;
    item: any;
  }): void {
    this.openModal.emit({
      type: event.type,
      action: event.action,
      item: event.item,
    });
  }
}
