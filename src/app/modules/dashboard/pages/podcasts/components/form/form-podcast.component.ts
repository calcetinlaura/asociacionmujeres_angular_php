import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { QuillModule } from 'ngx-quill';

import { filter, tap } from 'rxjs';
import { PodcastsFacade } from 'src/app/application/podcasts.facade';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-podcast',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ImageControlComponent,
    QuillModule,
  ],
  templateUrl: './form-podcast.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormPodcastComponent implements OnInit {
  private podcastsFacade = inject(PodcastsFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormPodcast = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  formPodcast = new FormGroup({
    title: new FormControl('', [Validators.required]),
    date: new FormControl('', [Validators.required]),
    description: new FormControl('', [Validators.maxLength(2000)]),
    img: new FormControl(''),
  });

  selectedImageFile: File | null = null;
  imageSrc = '';
  submitted = false;
  titleForm = 'Registrar Podcast';
  buttonAction = 'Guardar';
  typeList = TypeList.Podcasts;

  currentYear = this.generalService.currentYear;
  quillModules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      ['image', 'code-block'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link', 'clean'],
      [{ indent: '-1' }, { indent: '+1' }],
    ],
  };
  ngOnInit(): void {
    if (this.itemId) {
      this.podcastsFacade.loadPodcastById(this.itemId);
      this.podcastsFacade.selectedPodcast$
        .pipe(
          filter((podcast: PodcastModel | null) => podcast !== null),
          tap((podcast: PodcastModel | null) => {
            if (podcast) {
              this.formPodcast.patchValue({
                title: podcast.title || '',
                date: podcast.date,
                description: podcast.description || '',
                img: podcast.img || '',
              });

              this.titleForm = 'Editar Podcast';
              this.buttonAction = 'Guardar cambios';
              if (podcast.img) {
                this.imageSrc = podcast.img;
                this.selectedImageFile = null;
              }
            }
          })
        )
        .subscribe();
    }
  }

  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  onSendFormPodcast(): void {
    if (this.formPodcast.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formPodcast.errors);
      return;
    }
    const rawValues = { ...this.formPodcast.getRawValue() } as any;
    if (rawValues.description) {
      rawValues.description = rawValues.description.replace(/&nbsp;/g, ' ');
    }
    const formData = this.generalService.createFormData(
      rawValues,
      {
        img: this.selectedImageFile,
      },
      this.itemId
    );

    this.sendFormPodcast.emit({
      itemId: this.itemId,
      formData: formData,
    });
  }
}
