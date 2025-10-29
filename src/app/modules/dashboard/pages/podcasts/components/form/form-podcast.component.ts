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
import { MatCardModule } from '@angular/material/card';
import { QuillModule } from 'ngx-quill';
import { filter, tap } from 'rxjs';

import { PodcastsFacade } from 'src/app/application/podcasts.facade';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';

import { AudioControlComponent } from 'src/app/shared/components/audio-control/audio-control.component';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';

@Component({
  selector: 'app-form-podcast',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ImageControlComponent,
    AudioControlComponent,
    QuillModule,
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-podcast.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormPodcastComponent implements OnInit {
  readonly podcastsFacade = inject(PodcastsFacade);
  private readonly generalService = inject(GeneralService);
  private readonly destroyRef = inject(DestroyRef);

  // ────────────────────────────────────────────────────────────────
  // Inputs / Outputs
  // ────────────────────────────────────────────────────────────────
  @Input() itemId!: number;
  @Input() item: PodcastModel | null = null;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  // ────────────────────────────────────────────────────────────────
  // Estado
  // ────────────────────────────────────────────────────────────────
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
    season: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    episode: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
  });

  selectedImageFile: File | null = null;
  imageSrc = '';
  selectedPodcastFile: File | null = null;
  podcastAudio = '';
  duration: number | null = null;

  submitted = false;
  titleForm = 'Registrar Podcast';
  buttonAction = 'Guardar';
  typeList = TypeList.Podcasts;

  quillModules = this.generalService.defaultQuillModules;

  // ────────────────────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    if (this.item) {
      this.patchForm(this.item);
      return;
    }

    if (this.itemId) {
      this.podcastsFacade.loadPodcastById(this.itemId);
      this.podcastsFacade.selectedPodcast$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((p): p is PodcastModel => !!p),
          tap((p) => this.patchForm(p))
        )
        .subscribe();
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Métodos de carga
  // ────────────────────────────────────────────────────────────────
  private patchForm(podcast: PodcastModel): void {
    this.formPodcast.patchValue({
      title: podcast.title || '',
      date: podcast.date || '',
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

  // ────────────────────────────────────────────────────────────────
  // Imagen / Audio
  // ────────────────────────────────────────────────────────────────
  async onImageSelected(file: File): Promise<void> {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  async onAudioSelected(file: File | null): Promise<void> {
    if (!file) {
      this.formPodcast.patchValue({ podcast: null, duration: null });
      return;
    }
    this.formPodcast.patchValue({ podcast: file });
    const seconds = await this.getAudioDuration(file).catch(() => 0);
    this.formPodcast.patchValue({ duration: seconds });
  }

  private getAudioDuration(file: File): Promise<number> {
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
    return [hh, mm, ss].map((x) => x.toString().padStart(2, '0')).join(':');
  }

  // ────────────────────────────────────────────────────────────────
  // Envío
  // ────────────────────────────────────────────────────────────────
  onSendFormPodcast(): void {
    if (this.formPodcast.invalid) {
      this.submitted = true;
      this.formPodcast.markAllAsTouched();
      return;
    }

    const rawValues = { ...this.formPodcast.getRawValue() };
    const values = rawValues as Record<string, any>; // ✅ permite indexar por string

    ['description', 'technics', 'artists'].forEach((field) => {
      if (values[field]) {
        values[field] = values[field].replace(/&nbsp;/g, ' ');
      }
    });
    const formData = this.generalService.createFormData(
      rawValues,
      {
        img: this.selectedImageFile || rawValues.img,
        podcast: this.selectedPodcastFile || rawValues.podcast,
      },
      this.itemId
    );

    if (this.imageSrc && !this.selectedImageFile)
      formData.append('existingImg', this.imageSrc);
    if (this.podcastAudio && !this.selectedPodcastFile)
      formData.append('existingPodcast', this.podcastAudio);

    this.submitForm.emit({ itemId: this.itemId, formData });
  }

  // ────────────────────────────────────────────────────────────────
  // Utilidades
  // ────────────────────────────────────────────────────────────────
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
