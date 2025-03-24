import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
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
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-event',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    EditorModule,
    MatCardModule,
    ImageControlComponent,
  ],
  templateUrl: './form-event.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormEventComponent {
  private eventsFacade = inject(EventsFacade);
  private generalService = inject(GeneralService);
  @Input() itemId!: number;
  @Output() sendFormEvent = new EventEmitter<{
    itemId: number;
    newEventData: FormData;
  }>();
  selectedImageFile: File | null = null;
  eventData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar evento';
  buttonAction: string = 'Guardar';
  typeList = TypeList.Events;
  formEvent = new FormGroup(
    {
      title: new FormControl('', [Validators.required]),
      start: new FormControl('', [Validators.required]),
      end: new FormControl('', [Validators.required]),
      time: new FormControl(''),
      description: new FormControl('', [Validators.maxLength(2000)]),
      town: new FormControl(''),
      place: new FormControl(''),
      capacity: new FormControl(),
      price: new FormControl(''),
      img: new FormControl(''),
      status: new FormControl(''),
      status_reason: new FormControl(''),
      inscription: new FormControl(false),
    },
    { validators: this.dateRangeValidator }
  );

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
                status_reason: event.status_reason || '',
                inscription: event.inscription || false,
              });
              this.titleForm = 'Editar Evento';
              this.buttonAction = 'Guardar cambios';
              if (event.img) {
                this.imageSrc = event.img;
                this.selectedImageFile = null;
              }
            }
          })
        )
        .subscribe();
    }
    this.formEvent
      .get('status')
      ?.valueChanges.pipe(
        tap((value) => {
          if (value !== '') {
          }
        })
      )
      .subscribe();
  }

  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  onSendFormEvent(): void {
    if (this.formEvent.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formEvent.errors);
      return;
    }

    const formData = this.generalService.createFormData(
      this.formEvent.value,
      this.selectedImageFile,
      this.itemId
    );

    this.sendFormEvent.emit({ itemId: this.itemId, newEventData: formData });
  }
}
