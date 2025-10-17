import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { PiterasFacade } from 'src/app/application/piteras.facade';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { PiterasService } from 'src/app/core/services/piteras.services';
import { SectionGenericComponent } from 'src/app/modules/landing/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

// Hook reutilizable
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

@Component({
  selector: 'app-piteras-page-landing',
  standalone: true,
  imports: [CommonModule, SectionGenericComponent, SpinnerLoadingComponent],
  templateUrl: './piteras-page-landing.component.html',
  providers: [PiterasService],
})
export class PiterasPageLandingComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly piterasFacade = inject(PiterasFacade);
  private readonly piterasService = inject(PiterasService);

  typeList = TypeList;

  // Deriva lista, orden y total con signals
  readonly list = useEntityList<PiteraModel>({
    filtered$: this.piterasFacade.piteras$, // puede emitir null; el hook lo normaliza
    map: (arr) => arr, // opcional: transformar datos
    sort: (arr) => this.piterasService.sortPiterasByYear(arr),
    count: (arr) => this.piterasService.countPiteras(arr),
  });
  readonly totalSig = this.list.countSig;

  ngOnInit(): void {
    this.loadAllPiteras();
  }

  loadAllPiteras(): void {
    this.piterasFacade.loadAllPiteras();
    // No hace falta suscribirse a piteras$: useEntityList ya lo gestiona.
  }
}
