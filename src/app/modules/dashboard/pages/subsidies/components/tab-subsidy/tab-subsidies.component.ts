import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of, tap } from 'rxjs';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { SubsidyModel } from 'src/app/core/interfaces/subsidy.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { EurosFormatPipe } from 'src/app/shared/pipe/eurosFormat.pipe';
import { TableInvoicesComponent } from '../../../invoices/components/table-invoices/table-invoices.component';

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
  private destroyRef = inject(DestroyRef);

  @Input() item!: SubsidyModel;
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
  loading: boolean = true;
  amount_justified = 0;
  amountIrpf = 0;
  amount_association = 0;
  nameSubsidy = this.subsidiesService.subsidiesMap;
  typeActionModal = TypeActionModal;
  isModalVisible: boolean = false;

  load(): void {
    if (!this.loadInvoices || !this.item?.year || !this.item?.name) return;

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
