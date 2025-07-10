import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { tap } from 'rxjs';
import { PiterasFacade } from 'src/app/application/piteras.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { PiterasService } from 'src/app/core/services/piteras.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

@Component({
    selector: 'app-piteras-page',
    imports: [
        CommonModule,
        DashboardHeaderComponent,
        ModalComponent,
        ButtonIconComponent,
        ReactiveFormsModule,
        InputSearchComponent,
        SpinnerLoadingComponent,
        TableComponent,
    ],
    templateUrl: './piteras-page.component.html',
    styleUrl: './piteras-page.component.css'
})
export class PiterasPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly piterasFacade = inject(PiterasFacade);
  private readonly piterasService = inject(PiterasService);

  piteras: PiteraModel[] = [];
  filteredPiteras: PiteraModel[] = [];

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: PiteraModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeList = TypeList.Piteras;

  headerListPiteras: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
    { title: 'Año', key: 'year', sortable: true, width: ColumnWidth.XS },
    { title: 'Temática', key: 'theme', sortable: true },
    { title: 'Url', key: 'url', sortable: true },
  ];

  ngOnInit(): void {
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();

    this.loadAllPiteras();
  }

  loadAllPiteras(): void {
    this.piterasFacade.loadAllPiteras();
    this.piterasFacade.filteredPiteras$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((piteras) => {
          this.updatePiteraState(piteras);
        })
      )
      .subscribe();
  }

  applyFilterWord(keyword: string): void {
    this.piterasFacade.applyFilterWord(keyword);
  }

  addNewPiteraModal(): void {
    this.openModal(TypeActionModal.Create, null);
  }

  onOpenModal(event: { action: TypeActionModal; item?: PiteraModel }): void {
    this.openModal(event.action, event.item ?? null);
  }

  openModal(action: TypeActionModal, pitera: PiteraModel | null): void {
    this.currentModalAction = action;
    this.item = pitera;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeletePitera(pitera: PiteraModel | null): void {
    if (!pitera) return;
    this.piterasFacade.deletePitera(pitera.id);
    this.onCloseModal();
  }

  sendFormPitera(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.piterasFacade.editPitera(event.itemId, event.formData)
      : this.piterasFacade.addPitera(event.formData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updatePiteraState(piteras: PiteraModel[] | null): void {
    if (!piteras) return;

    this.piteras = this.piterasService.sortPiterasByYear(piteras);
    this.filteredPiteras = [...this.piteras];
    this.number = this.piterasService.countPiteras(piteras);
    this.isLoading = false;
  }
}
