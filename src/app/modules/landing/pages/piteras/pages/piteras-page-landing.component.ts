import { Component, DestroyRef, inject } from '@angular/core';
import { PiterasService } from 'src/app/core/services/piteras.services';
import { SectionGenericComponent } from '../../../components/section-generic/section-generic.component';
import { TypeList } from 'src/app/core/models/general.model';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { SpinnerLoadingComponent } from '../../../components/spinner-loading/spinner-loading.component';
import { CommonModule } from '@angular/common';
import { PiterasFacade } from 'src/app/application';

@Component({
  selector: 'app-piteras-page-landing',
  standalone: true,
  imports: [CommonModule, SectionGenericComponent, SpinnerLoadingComponent],
  templateUrl: './piteras-page-landing.component.html',
  providers: [PiterasService],
})
export class PiterasPageLandingComponent {
  private piterasFacade = inject(PiterasFacade);
  private destroyRef = inject(DestroyRef);

  typeList = TypeList;
  piteras: PiteraModel[] = [];
  number: number = 0;
  isLoading: boolean = true;

  ngOnInit(): void {
    this.loadAllPiteras();
  }

  loadAllPiteras(): void {
    this.piterasFacade.loadAllPiteras();
    this.piterasFacade.piteras$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((piteras) => {
          if (piteras === null) {
            return;
          }
          this.piteras = piteras.sort((a, b) => b.year - a.year);
          this.number = this.piteras.length;
          this.isLoading = false;
        })
      )
      .subscribe();
  }
}
