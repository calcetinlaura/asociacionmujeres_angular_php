import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DashboardHeaderComponent } from '../../components/dashboard-header/dashboard-header.component';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { TableComponent } from '../../components/table/table.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';
import { PiterasFacade } from 'src/app/application';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { tap } from 'rxjs';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerLoadingComponent } from '../../../landing/components/spinner-loading/spinner-loading.component';

@Component({
  selector: 'app-piteras-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    TableComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
  ],
  templateUrl: './piteras-page.component.html',
  styleUrl: './piteras-page.component.css',
})
export class PiterasPageComponent implements OnInit {
  private piterasFacade = inject(PiterasFacade);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);

  typeList = TypeList.Piteras;
  piteras: PiteraModel[] = [];
  filteredPiteras: PiteraModel[] = [];
  searchForm!: FormGroup;
  dataLoaded: boolean = false;
  number: number = 0;
  headerListPiteras: ColumnModel[] = [];
  isModalVisible: boolean = false;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  item: any;
  searchKeywordFilter = new FormControl();
  isStickyToolbar: boolean = false;

  @ViewChild('toolbar') toolbar!: ElementRef;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    if (scrollPosition > 50) {
      this.isStickyToolbar = true;
    } else {
      this.isStickyToolbar = false;
    }
  }

  ngOnInit(): void {
    this.loadAllPiteras();

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();

    this.headerListPiteras = [
      { title: 'Portada', key: 'img' },
      { title: 'Título', key: 'title' },
      { title: 'Año', key: 'year' },
      { title: 'Tema', key: 'theme' },
      { title: 'Url', key: 'url' },
    ];
  }

  loadAllPiteras(): void {
    this.piterasFacade.loadAllPiteras();
    this.piterasFacade.piteras$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((piteras) => {
          this.updatePiteraState(piteras);
        })
      )
      .subscribe();
  }

  applyFilterWord(keyword: string): void {
    if (!keyword) {
      // Si no hay palabra clave, mostrar todos las piteras
      this.filteredPiteras = this.piteras;
    } else {
      keyword = keyword.toLowerCase();
      this.filteredPiteras = this.piteras.filter((pitera) =>
        Object.values(pitera).join(' ').toLowerCase().includes(keyword)
      );
    }
    this.number = this.filteredPiteras.length;
  }

  confirmDeletePitera(item: any): void {
    this.piterasFacade.deletePitera(item.id);
    this.onCloseModal();
  }

  addNewPiteraModal(): void {
    this.currentModalAction = TypeActionModal.Create;
    this.item = null;
    this.modalService.openModal();
  }

  onOpenModal(pitera: { action: TypeActionModal; item?: any }): void {
    this.currentModalAction = pitera.action;
    this.item = pitera.item;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  sendFormPitera(pitera: { itemId: number; newPiteraData: FormData }): void {
    if (pitera.itemId) {
      this.piterasFacade
        .editPitera(pitera.itemId, pitera.newPiteraData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    } else {
      this.piterasFacade
        .addPitera(pitera.newPiteraData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    }
  }

  private updatePiteraState(piteras: PiteraModel[] | null): void {
    if (piteras === null) {
      return;
    }

    this.piteras = piteras.sort((a, b) => b.year - a.year); // 🔹 Ordenar de mayor a menor (descendente)

    this.filteredPiteras = [...this.piteras];
    this.number = this.piteras.length;
    this.dataLoaded = true;
  }
}
