import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { PiterasFacade } from 'src/app/application/piteras.facade';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { PiterasService } from 'src/app/core/services/piteras.services';
import { SectionGenericComponent } from 'src/app/modules/landing/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

@Component({
  selector: 'app-piteras-page-landing',
  standalone: true,
  imports: [CommonModule, SectionGenericComponent, SpinnerLoadingComponent],
  templateUrl: './piteras-page-landing.component.html',
  providers: [PiterasService],
})
export class PiterasPageLandingComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly piterasFacade = inject(PiterasFacade);
  private readonly piterasService = inject(PiterasService);

  piteras: PiteraModel[] = [];
  isLoading = true;
  typeList = TypeList;
  number = 0;

  ngOnInit(): void {
    this.loadAllPiteras();
  }

  loadAllPiteras(): void {
    this.piterasFacade.loadAllPiteras();
    this.piterasFacade.piteras$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((piteras) => {
          if (!piteras) return;
          this.piteras = this.piterasService.sortPiterasByYear(piteras);
          this.number = this.piterasService.countPiteras(piteras);
          this.isLoading = false;
        })
      )
      .subscribe();
  }
}
