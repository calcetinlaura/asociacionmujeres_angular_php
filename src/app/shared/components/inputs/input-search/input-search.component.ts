import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  OnInit,
  Output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject, tap } from 'rxjs';

@Component({
  selector: 'app-input-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './input-search.component.html',
  styleUrls: ['./input-search.component.css'],
})
export class InputSearchComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  // Valor actual del input
  searchTerm = '';

  // Emisor para el debounce
  private readonly debouncer = new Subject<string>();

  // Eventos hacia el exterior
  @Output() onValue = new EventEmitter<string>();
  @Output() onDebounce = new EventEmitter<string>();

  ngOnInit(): void {
    this.debouncer
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(300),
        tap((value) => this.onDebounce.emit(value))
      )
      .subscribe();
  }

  // Evento al escribir
  onKeyPress(searchTerm: string): void {
    this.debouncer.next(searchTerm);
    this.onValue.emit(searchTerm);
  }

  // ✅ Limpia el campo y notifica hacia afuera
  clear(): void {
    this.searchTerm = '';
    this.debouncer.next('');
    this.onDebounce.emit('');
  }
}
