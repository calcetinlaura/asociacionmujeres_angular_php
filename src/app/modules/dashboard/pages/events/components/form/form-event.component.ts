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
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { EditorModule } from '@tinymce/tinymce-angular';
import { filter, tap } from 'rxjs';
import { EventsFacade } from 'src/app/application';
import { EventModel } from 'src/app/core/interfaces/event.interface';
import { EventsService } from 'src/app/core/services/events.services';

@Component({
  selector: 'app-form-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EditorModule, MatCardModule],
  templateUrl: './form-event.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
  providers: [EventsService],
})
export class FormEventComponent {
  @Input() itemId!: number;
  @Output() sendFormEvent = new EventEmitter<EventModel>();

  eventData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar evento';
  buttonAction: string = 'Guardar';

  formEvent = new FormGroup(
    {
      title: new FormControl('', [Validators.required]),
      start: new FormControl(''),
      end: new FormControl(''),
      time: new FormControl(''),
      description: new FormControl('', [Validators.maxLength(2000)]),
      town: new FormControl(''),
      place: new FormControl(''),
      capacity: new FormControl(),
      price: new FormControl(''),
      img: new FormControl(''),
      status: new FormControl(''),
      statusReason: new FormControl(''),
      inscription: new FormControl(false),
    },
    { validators: this.dateRangeValidator }
  );

  private eventsFacade = inject(EventsFacade);
  private destroyRef = inject(DestroyRef);

  private dateRangeValidator(control: AbstractControl) {
    const start = control.get('start')?.value;
    const end = control.get('end')?.value;

    if (start && end && end < start) {
      control.get('end')?.setErrors({ invalidDateRange: true });
      return { invalidDateRange: true };
    }

    return null;
  }
  ngOnInit(): void {
    if (this.itemId) {
      this.eventsFacade.loadEventById(this.itemId);
      this.eventsFacade.selectedEvent$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((event: EventModel | null) => event !== null),
          tap((event: EventModel | null) => {
            if (event) {
              this.formEvent.patchValue({
                title: event.title,
                start: event.start || '',
                end: event.end || '',
                time: event.time || '',
                description: event.description || '',
                town: event.town || '',
                place: event.place || '',
                capacity: event.capacity || undefined,
                price: event.price || '',
                img: event.img || '',
                status: event.status || '',
                statusReason: event.statusReason || '',
                inscription: event.inscription || false,
              });
              this.titleForm = 'Editar Evento';
              this.buttonAction = 'Guardar cambios';
            }
          })
        )
        .subscribe();
    }
    this.formEvent
      .get('status')
      ?.valueChanges.pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((value) => {
          if (value !== '') {
          }
        })
      )
      .subscribe();
  }

  onSendFormEvent(): void {
    this.submitted = true;

    if (this.formEvent.invalid) {
      Object.keys(this.formEvent.controls).forEach((key) => {
        const control = this.formEvent.get(key);
        if (control && control.invalid) {
          console.log(`Control ${key} tiene errores:`, control.errors);
        }
      });

      return;
    }

    const formValue: EventModel = {
      title: this.formEvent.get('title')?.value || '',
      start: this.formEvent.get('start')?.value || '',
      end:
        this.formEvent.get('end')?.value ||
        this.formEvent.get('start')?.value ||
        '',
      time: this.formEvent.get('time')?.value?.toString() || '',
      description: this.formEvent.get('description')?.value || '',
      town: this.formEvent.get('town')?.value || '',
      place: this.formEvent.get('place')?.value || '',
      capacity: this.formEvent.get('capacity')?.value || undefined,
      price: this.formEvent.get('price')?.value || '',
      img: this.formEvent.get('img')?.value || '',
      status: this.formEvent.get('status')?.value || '',
      statusReason: this.formEvent.get('statusReason')?.value || '',
      inscription: this.formEvent.get('inscription')?.value || false,
    };
    this.sendFormEvent.emit(formValue);
  }
}
