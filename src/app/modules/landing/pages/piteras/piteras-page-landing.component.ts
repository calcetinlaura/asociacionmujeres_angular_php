import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { ModalFacade } from 'src/app/application/modal.facade';

import { PiterasFacade } from 'src/app/application/piteras.facade';

import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { PiterasService } from 'src/app/core/services/piteras.services';

import { SectionGenericComponent } from 'src/app/shared/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

// Hook reutilizable
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { NoResultsComponent } from 'src/app/shared/components/no-results/no-results.component';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { count, sortByYear } from 'src/app/shared/utils/facade.utils';

@Component({
  selector: 'app-piteras-page-landing',
  standalone: true,
  imports: [
    CommonModule,
    SectionGenericComponent,
    SpinnerLoadingComponent,
    NoResultsComponent,
    ModalShellComponent,
  ],
  templateUrl: './piteras-page-landing.component.html',
  providers: [PiterasService],
})
export class PiterasPageLandingComponent implements OnInit {
  readonly piterasFacade = inject(PiterasFacade);
  readonly modalFacade = inject(ModalFacade);

  readonly TypeList = TypeList;

  // ===== Signals derivadas con useEntityList =====
  readonly list = useEntityList<PiteraModel>({
    filtered$: this.piterasFacade.piteras$,
    map: (arr) => arr,
    sort: (arr) => sortByYear(arr),
    count: (arr) => count(arr),
  });

  readonly totalSig = this.list.countSig;
  readonly hasResultsSig = computed(() => this.totalSig() > 0);

  // ======================================================
  //  Ciclo de vida
  // ======================================================
  ngOnInit(): void {
    this.loadAllPiteras();
  }

  loadAllPiteras(): void {
    this.piterasFacade.loadAllPiteras();
  }

  // ======================================================
  //  Acciones con modal
  // ======================================================
  openPiteraDetails(pitera: PiteraModel): void {
    this.modalFacade.open(TypeList.Piteras, TypeActionModal.Show, pitera);
  }

  closeModal(): void {
    this.modalFacade.close();
  }
}
