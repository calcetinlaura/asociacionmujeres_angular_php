import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { tap } from 'rxjs';

import { EventsReportsFacade } from 'src/app/application/events-reports.facade';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';

@Component({
  selector: 'app-form-event-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-event-report.component.html',
  styleUrls: ['../../../../../../../shared/components/form/form.component.css'],
})
export class FormEventReportComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private generalService = inject(GeneralService);
  readonly eventsReportsFacade = inject(EventsReportsFacade);

  @Input() eventId!: number;
  @Input() itemId!: number;
  @Input() action: TypeActionModal = TypeActionModal.Create;

  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  typeList = TypeList.EventsReports;
  isLoading = true;
  submitted = false;
  titleForm = 'Informe de cierre del evento';
  buttonAction = 'Guardar informe';

  formReport = new FormGroup({
    attendance_real: new FormControl<number | null>(null, [Validators.min(0)]),
    satisfaction_avg: new FormControl('', [Validators.maxLength(100)]),
    incidents: new FormControl('', [Validators.maxLength(1000)]),
    highlights: new FormControl('', [Validators.maxLength(1000)]),
    improvements: new FormControl('', [Validators.maxLength(1000)]),
    collaborators_eval: new FormControl('', [Validators.maxLength(1000)]),
    notes: new FormControl('', [Validators.maxLength(2000)]),
  });

  ngOnInit(): void {
    console.log('🟢 Inicializando FormEventReportComponent', {
      eventId: this.eventId,
      itemId: this.itemId,
      action: this.action,
    });

    if (this.itemId && this.action === TypeActionModal.Edit) {
      this.loadReport();
    } else {
      this.isLoading = false;
    }
  }

  private loadReport(): void {
    this.isLoading = true;
    this.eventsReportsFacade.loadReportByEventId(this.itemId);

    this.eventsReportsFacade.selectedReport$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((report: any) => {
          console.log('📄 [Componente] Informe recibido:', report);

          if (!report) {
            // Si no hay informe, salimos del modo carga y dejamos el form vacío
            this.isLoading = false;
            return;
          }

          this.formReport.patchValue({
            attendance_real: report.attendance_real ?? null,
            satisfaction_avg: report.satisfaction_avg ?? '',
            incidents: report.incidents ?? '',
            highlights: report.highlights ?? '',
            improvements: report.improvements ?? '',
            collaborators_eval: report.collaborators_eval ?? '',
            notes: report.notes ?? '',
          });

          // ✅ actualizamos el id real del informe
          this.itemId = report.id;

          this.titleForm = 'Editar informe de evento';
          this.buttonAction = 'Guardar cambios';
          this.isLoading = false;
        })
      )
      .subscribe();
  }

  onSendFormReport(): void {
    if (this.formReport.invalid) {
      this.submitted = true;
      console.warn('Formulario inválido', this.formReport.errors);
      return;
    }

    const rawValues = { ...this.formReport.getRawValue() };
    const formData = this.generalService.createFormData(rawValues);
    formData.append('event_id', this.eventId.toString());

    if (this.action === TypeActionModal.Edit && this.itemId) {
      formData.append('_method', 'PATCH');
      formData.append('id', this.itemId.toString());

      this.eventsReportsFacade.edit(formData).subscribe(() => {
        console.log('✅ Informe actualizado correctamente');
        this.submitForm.emit({ itemId: this.itemId, formData });
      });
    } else {
      this.eventsReportsFacade.add(formData).subscribe(() => {
        console.log('✅ Informe creado correctamente');
        this.submitForm.emit({ itemId: this.itemId, formData });
      });
    }
  }
  // ── Contadores de caracteres ───────────────────────────────
  incidentsLen(): number {
    return (this.formReport.get('incidents')?.value || '').length;
  }
  highlightsLen(): number {
    return (this.formReport.get('highlights')?.value || '').length;
  }
  improvementsLen(): number {
    return (this.formReport.get('improvements')?.value || '').length;
  }
  collaboratorsEvalLen(): number {
    return (this.formReport.get('collaborators_eval')?.value || '').length;
  }
  notesLen(): number {
    return (this.formReport.get('notes')?.value || '').length;
  }
}
