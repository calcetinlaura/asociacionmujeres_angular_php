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
import { AudioControlComponent } from 'src/app/modules/dashboard/components/audio-control//audio-control.component';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-podcast',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ImageControlComponent,
    QuillModule,
    SpinnerLoadingComponent,
    AudioControlComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-podcast.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormPodcastComponent implements OnInit {
  private podcastsFacade = inject(PodcastsFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  formPodcast = new FormGroup({
    title: new FormControl('', [Validators.required]),
    date: new FormControl(''),
    description: new FormControl('', [Validators.maxLength(2000)]),
    summary: new FormControl('', [Validators.maxLength(300)]),
    img: new FormControl(''),
    artists: new FormControl('', [Validators.maxLength(500)]),
    technics: new FormControl('', [Validators.maxLength(500)]),
    duration: new FormControl<number | null>(null),
    podcast: new FormControl<string | File | null>(null),
    season: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    episode: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
  });

  selectedImageFile: File | null = null;
  imageSrc = '';
  selectedPodcastFile: File | null = null;
  podcastAudio = '';
  submitted = false;
  titleForm = 'Registrar Podcast';
  buttonAction = 'Guardar';
  typeList = TypeList.Podcasts;

  currentYear = this.generalService.currentYear;
  isLoading = true;
  duration: number | null = null;
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
    this.isLoading = true;
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
                summary: podcast.summary || '',
                img: podcast.img || '',
                duration: podcast.duration || null,
                artists: podcast.artists || '',
                technics: podcast.technics || '',
                podcast: podcast.podcast || '',
                season: podcast.season || null,
                episode: podcast.episode || null,
              });

              this.titleForm = 'Editar Podcast';
              this.buttonAction = 'Guardar cambios';
              if (podcast.img) {
                this.imageSrc = podcast.img;
                this.selectedImageFile = null;
              }
              if (podcast.podcast) {
                this.podcastAudio = podcast.podcast;
                this.selectedPodcastFile = null;
              }
            }
            this.isLoading = false;
          })
        )
        .subscribe();
    } else {
      this.isLoading = false;
    }
  }

  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  async onAudioSelected(file: File | null) {
    if (!file) {
      this.formPodcast.patchValue({ podcast: null, duration: null });
      return;
    }

    this.formPodcast.patchValue({ podcast: file });

    const seconds = await this.getAudioDuration(file).catch(() => 0); // ya devuelve segundos
    // ✅ guarda segundos directamente
    this.formPodcast.patchValue({ duration: seconds });
  }

  // helper reutilizable
  getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      const url = URL.createObjectURL(file);
      audio.src = url;

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(
          Number.isFinite(audio.duration) ? Math.floor(audio.duration) : 0
        );
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo leer la metadata del audio.'));
      };
    });
  }
  formatDuration(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const hhStr = hh.toString().padStart(2, '0');
    const mmStr = mm.toString().padStart(2, '0');
    const ssStr = ss.toString().padStart(2, '0');
    return `${hhStr}:${mmStr}:${ssStr}`;
  }
  onSendFormPodcast(): void {
    if (this.formPodcast.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formPodcast.errors);
      return;
    }
    const rawValues = { ...this.formPodcast.getRawValue() };

    // Limpiar campos de texto enriquecido
    if (rawValues.description) {
      rawValues.description = rawValues.description.replace(/&nbsp;/g, ' ');
    }
    if (rawValues.technics) {
      rawValues.technics = rawValues.technics.replace(/&nbsp;/g, ' ');
    }
    if (rawValues.artists) {
      rawValues.artists = rawValues.artists.replace(/&nbsp;/g, ' ');
    }

    // Usar imagen y audio, igual que con las imágenes
    const imageToSend = this.selectedImageFile || rawValues.img || null;

    const podcastToSend = this.selectedPodcastFile || rawValues.podcast || null;

    // Crear el FormData final
    const formData = this.generalService.createFormData(
      rawValues,
      {
        img: imageToSend,
        podcast: podcastToSend,
      },
      this.itemId
    );

    // Emitir el formulario
    this.submitForm.emit({
      itemId: this.itemId,
      formData: formData,
    });
  }

  summaryLen(): number {
    return (this.formPodcast.get('summary')?.value || '').length;
  }
  descriptionLen(): number {
    return (this.formPodcast.get('description')?.value || '').length;
  }
  artistsLen(): number {
    return (this.formPodcast.get('artists')?.value || '').length;
  }
  technicsLen(): number {
    return (this.formPodcast.get('technics')?.value || '').length;
  }
}
