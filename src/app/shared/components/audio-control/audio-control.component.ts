import { HttpClient } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { TypeList } from 'src/app/core/models/general.model';

@Component({
  selector: 'app-audio-control',
  templateUrl: './audio-control.component.html',
  imports: [],
  standalone: true,
})
export class AudioControlComponent implements OnChanges, OnDestroy {
  @Input() previewAudio: string | File | null = null;
  @Input() type: TypeList | null = null; // ya no imprescindible
  @Output() audioSelected = new EventEmitter<File | null>();
  @Input() audioViewerHeight = 360;
  @Input() textAudio = 'Añadir audio';

  audioHeight = 0;
  previewUrl: SafeResourceUrl | null = null;
  fullAudioUrl = '';
  isAudioAvailable = false;

  private objectUrl: string | null = null;
  private blobSub?: Subscription;

  // 👇 Alinea con el backend (tiene PODCASTS con S)
  basePath = '/uploads/audio/PODCASTS';

  constructor(private sanitizer: DomSanitizer, private http: HttpClient) {}

  ngOnChanges(_: SimpleChanges): void {
    this.loadAudio();
  }

  ngOnDestroy(): void {
    this.cleanupObjectUrl();
    this.blobSub?.unsubscribe();
  }

  private cleanupObjectUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private setPreviewFromBlob(blob: Blob) {
    this.cleanupObjectUrl();
    this.objectUrl = URL.createObjectURL(blob);
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      this.objectUrl
    );
    this.isAudioAvailable = true;
  }

  private loadAudio(): void {
    this.audioHeight = Math.max(40, this.audioViewerHeight - 40);
    this.isAudioAvailable = false;
    this.cleanupObjectUrl();
    this.blobSub?.unsubscribe();
    this.previewUrl = null;

    if (!this.previewAudio) return;

    // Caso: File recibido (nuevo)
    if (this.previewAudio instanceof File) {
      this.setPreviewFromBlob(this.previewAudio);
      return;
    }

    // Caso: string (nombre o URL)
    if (typeof this.previewAudio === 'string') {
      // URL absoluta => respétala
      if (/^https?:\/\//i.test(this.previewAudio)) {
        this.fullAudioUrl = this.previewAudio;
      } else {
        this.fullAudioUrl = `${this.basePath}/${this.previewAudio}`;
      }

      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        this.fullAudioUrl
      );
      this.isAudioAvailable = true;
      return;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type || !file.type.startsWith('audio/')) {
      input.value = '';
      return;
    }

    this.setPreviewFromBlob(file);
    this.audioSelected.emit(file);
    input.value = '';
  }

  removeAudio(): void {
    this.previewUrl = null;
    this.isAudioAvailable = false;
    this.audioSelected.emit(null);
    this.cleanupObjectUrl();
  }

  openAudioNewWindow(): void {
    if (this.previewUrl && this.isAudioAvailable) {
      const url = (this.previewUrl as any)
        .changingThisBreaksApplicationSecurity as string;
      window.open(url, '_blank');
    }
  }
}
