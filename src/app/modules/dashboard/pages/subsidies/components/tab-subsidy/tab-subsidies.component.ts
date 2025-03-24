import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { InvoiceModel } from 'src/app/core/interfaces/invoice.interface';
import { SubsidyModel } from 'src/app/core/interfaces/subsidy.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TableInvoicesComponent } from '../../../invoices/components/table-invoices/table-invoices.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { IconActionComponent } from '../../../../../../shared/components/buttons/icon-action/icon-action.component';
import { EurosFormatPipe } from '../../../../../../shared/pipe/eurosFormat.pipe';

@Component({
  selector: 'app-tab-subsidy',
  standalone: true,
  imports: [
    CommonModule,
    TextEditorComponent,
    TableInvoicesComponent,
    MatIconModule,
    IconActionComponent,
    EurosFormatPipe,
  ],
  templateUrl: './tab-subsidies.component.html',
  styleUrls: ['./tab-subsidies.component.css'],
})
export class ModalShowSubsidyComponent {
  private subsidiesService = inject(SubsidiesService);
  private invoicesService = inject(InvoicesService);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);

  @Input() item!: SubsidyModel;

  @Output() openModal = new EventEmitter<{
    type: TypeList;
    action: TypeActionModal;
    item: any;
  }>();
  itemInvoice?: InvoiceModel;
  typeList = TypeList;
  type: TypeList = TypeList.Subsidies;
  filteredInvoices: InvoiceModel[] = [];
  number_invoices: number = 0;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  loading: boolean = true;
  amount_justified = 0;
  amountIrpf = 0;
  amount_association = 0;
  nameSubsidy = this.subsidiesService.subsidiesMap;
  typeActionModal = TypeActionModal;
  isModalVisible: boolean = false;

  ngOnInit(): void {
    this.loading = true;
    const year = this.item.year;
    console.log('🧪 Subsidy input YEAR:', this.item.year);
    const subsidy = this.item.name;

    if (year && subsidy) {
      this.invoicesService
        .getInvoicesBySubsidy(subsidy, year)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap((invoices: InvoiceModel[]) => {
            this.filteredInvoices = invoices;
            this.number_invoices = invoices.length;
            this.amount_justified = invoices.reduce(
              (acc, invoice) => acc + (invoice.total_amount || 0),
              0
            );
            this.amountIrpf = invoices.reduce(
              (acc, invoice) => acc + (invoice.irpf || 0),
              0
            );
            this.amount_association =
              this.amount_justified -
              (this.item.amount_granted ? this.item.amount_granted : 0);
            this.loading = false;
          }),
          catchError((error) => {
            this.loading = false;
            console.error('Error al cargar las facturas', error);
            return of([]);
          })
        )
        .subscribe();
    }
    // Suscripción a los cambios de visibilidad del modal
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();
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
